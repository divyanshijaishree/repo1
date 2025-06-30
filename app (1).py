from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import re
import ollama
import logging

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/generate-code', methods=['POST'])
def generate_code():
    try:
        data = request.get_json()
        prompt = data.get('prompt', '').strip()
        language = data.get('language', 'python').lower()

        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400

        logger.info(f"Generating {language} code for prompt: {prompt[:50]}...")

        response = ollama.chat(
            model='qwen2.5-coder:0.5b',
            messages=[{
                'role': 'user',
                'content':  f"""Write a complete, standalone executable {language} program that performs the following task: "{prompt}".
Do not assume any pre-defined code.
Include all necessary imports, function definitions, and a main block or sample input/output so the code produces visible results when run.
Output ONLY the code, wrapped in triple backticks. Do not include any comments or explanations."""
            }]
        )

        generated_content = response['message']['content']
        code = extract_code(generated_content, language)
        
        if not code:
            return jsonify({'error': 'Failed to generate valid code'}), 500

        return jsonify({'code': code})

    except Exception as e:
        logger.error(f"Code generation error: {str(e)}")
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def extract_code(content, language):
    try:
        code_blocks = re.findall(r'```(?:.*?)\n(.*?)```', content, re.DOTALL)
        if code_blocks:
            code = code_blocks[0].strip()
            return re.sub(r'^\s*\w+\n', '', code)
        code_lines = []
        in_code = False
        for line in content.split('\n'):
            if any(line.lstrip().startswith(s) for s in ['def ', 'function ', 'class ', 'void ', 'int ', 'import ', 'export '] or line.strip()):
                in_code = True
            if in_code:
                code_lines.append(line)
        return '\n'.join(code_lines).strip()
    except Exception as e:
        logger.error(f"Code extraction error: {str(e)}")
        return content.strip()

@app.route('/execute', methods=['POST'])
def execute_code():
    try:
        data = request.get_json()
        code = data.get('code', '').strip()
        language = data.get('language', 'python').lower()
        input_data = data.get('input', '').strip()  # <-- New

        if not code or not language:
            return jsonify({'status': 'error', 'output': 'Missing code or language'}), 400

        logger.info(f"Executing {language} code with input: {input_data[:100]}...")

        with tempfile.TemporaryDirectory() as temp_dir:
            file_info = get_file_info(code, language, temp_dir)
            if 'error' in file_info:
                return jsonify(file_info), 400

            compile_result = compile_code(language, file_info)
            if compile_result and 'error' in compile_result:
                return jsonify(compile_result), 400

            execution_result = execute_program(language, file_info, input_data)
            return jsonify(execution_result)

    except subprocess.TimeoutExpired:
        return jsonify({'status': 'error', 'output': 'Execution timed out (15s limit)'}), 400
    except Exception as e:
        logger.error(f"Execution error: {str(e)}")
        return jsonify({'status': 'error', 'output': f'Internal error: {str(e)}'}), 500

def get_file_info(code, language, temp_dir):
    file_info = {
        'path': None,
        'class_name': None,
        'executable': None
    }

    try:
        if language == 'java':
            class_match = re.search(r'public\s+class\s+(\w+)', code)
            if not class_match:
                return {'error': 'No public class found in Java code'}
            file_info['class_name'] = class_match.group(1)
            filename = f"{file_info['class_name']}.java"
        else:
            filename = {
                'python': 'main.py',
                'javascript': 'main.js',
                'c': 'main.c',
                'cpp': 'main.cpp'
            }.get(language, 'code.txt')

        file_path = os.path.join(temp_dir, filename)
        with open(file_path, 'w') as f:
            f.write(code)
        file_info['path'] = file_path

        if language in ['c', 'cpp']:
            ext = '.exe' if os.name == 'nt' else '.out'
            file_info['executable'] = os.path.join(temp_dir, f'program{ext}')

        return file_info

    except Exception as e:
        return {'error': f'File handling failed: {str(e)}'}

def compile_code(language, file_info):
    try:
        compile_commands = {
            'java': ['javac', file_info['path']],
            'c': ['gcc', file_info['path'], '-o', file_info['executable']],
            'cpp': ['g++', file_info['path'], '-o', file_info['executable']]
        }

        if language in compile_commands:
            result = subprocess.run(
                compile_commands[language],
                capture_output=True,
                text=True,
                timeout=15
            )
            if result.returncode != 0:
                return {
                    'status': 'error',
                    'output': f"Compilation error:\n{result.stderr}"
                }
        return None

    except subprocess.TimeoutExpired:
        return {'status': 'error', 'output': 'Compilation timed out'}
    except Exception as e:
        return {'error': f'Compilation failed: {str(e)}'}

def execute_program(language, file_info, input_data=''):
    try:
        execute_commands = {
            'python': ['python', file_info['path']],
            'javascript': ['node', file_info['path']],
            'java': ['java', '-cp', os.path.dirname(file_info['path']), file_info['class_name']],
            'c': [file_info['executable']],
            'cpp': [file_info['executable']]
        }

        result = subprocess.run(
            execute_commands[language],
            input=input_data,
            capture_output=True,
            text=True,
            timeout=20
        )

        return {
            'status': 'success' if result.returncode == 0 else 'error',
            'output': result.stdout or result.stderr
        }

    except subprocess.TimeoutExpired:
        return {'status': 'error', 'output': 'Execution timed out'}
    except Exception as e:
        return {'status': 'error', 'output': f'Execution failed: {str(e)}'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
