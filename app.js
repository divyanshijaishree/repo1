// Final JavaScript with All Scheduling Algorithms Working
$(document).ready(function () {
  $('#resultsSection').hide();
  $('#summarySection').hide();
  $('#btnShowSummaryWrapper').hide();

  $(".form-group-time-quantum").hide();
  $('#btnCalculate').prop('disabled', true);

  $('#algorithmSelector').on('change', function () {
    if (this.value === 'optRR') {
      $(".form-group-time-quantum").show(1000);
    } else {
      $(".form-group-time-quantum").hide(1000);
    }
  });

  var processList = [];
  
  $('#btnAddProcess').on('click', function () {
    var processID = $('#processID');
    var arrivalTime = $('#arrivalTime');
    var burstTime = $('#burstTime');
    var priority = $('#priority');
    
    if (processID.val() === '' || arrivalTime.val() === '' || burstTime.val() === '') {
      processID.addClass('is-invalid');
      arrivalTime.addClass('is-invalid');
      burstTime.addClass('is-invalid');
      return;
    }

    processID.removeClass('is-invalid');
    arrivalTime.removeClass('is-invalid');
    burstTime.removeClass('is-invalid');

    var pVal = parseInt(priority.val(), 10);
    if (isNaN(pVal)) pVal = 0;

    var process = {
      processID: parseInt(processID.val(), 10),
      arrivalTime: parseInt(arrivalTime.val(), 10),
      burstTime: parseInt(burstTime.val(), 10),
      priority: pVal,
      queue: 1
    };

    processList.push(process);

    $('#tblProcessList > tbody:last-child').append(
      `<tr>
          <td>${processID.val()}</td>
          <td>${arrivalTime.val()}</td>
          <td>${burstTime.val()}</td>
      </tr>`
    );

    processID.val('');
    arrivalTime.val('');
    burstTime.val('');
    priority.val('');

    $('#btnCalculate').prop('disabled', false);
  });

  $('#btnCalculate').on('click', function () {
    $('#resultsSection').fadeIn();
    $('#btnShowSummaryWrapper').fadeIn();
    $('#summarySection').fadeIn();

    $('#tblResults tbody').empty();

    if (processList.length === 0) {
      alert('Please insert some processes');
      return;
    }

    var selectedAlgo = $('#algorithmSelector').val();

    if (selectedAlgo === 'optFCFS') firstComeFirstServed();
    if (selectedAlgo === 'optSJF') shortestJobFirst();
    if (selectedAlgo === 'optSRTF') shortestRemainingTimeFirst();
    if (selectedAlgo === 'optRR') roundRobin();
    if (selectedAlgo === 'optPriority') priorityScheduling();
    if (selectedAlgo === 'optMLQ') multiLevelQueueScheduling();

    $('#tblProcessList tbody').empty();
    processList = [];
    $('#btnCalculate').prop('disabled', true);

    setTimeout(() => {lottieInstance = lottie.loadAnimation({
        container: document.getElementById('lottieAnimation'),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: 'https://assets10.lottiefiles.com/packages/lf20_touohxv0.json'
      });
    }, 500);
  });

  $('#btnReset').on('click', function () {
    $('#tblResults tbody').empty();
    if (window.ganttInstance) {
      window.ganttInstance.destroy();
      window.ganttInstance = null;
    }
    $('#resultsSection').hide();
    $('#summarySection').hide();
    $('#btnShowSummaryWrapper').hide();

    $('#avgTurnaroundTime').val('');
    $('#avgWaitingTime').val('');
    $('#throughput').val('');
    $('#algorithmSelector').val('optFCFS').trigger('change');
    $('.form-group-time-quantum').hide();
    $('#tblProcessList tbody').empty();
    $('#processID').val('');
    $('#arrivalTime').val('');
    $('#burstTime').val('');
    $('#priority').val('');
    $('#timeQuantum').val('');
    processList = [];
    $('#btnCalculate').prop('disabled', true);});

  function updateTableAndMetrics(list) {
    var totalTAT = 0, totalWT = 0, maxCT = 0;
    list.forEach(p => {
      $('#tblResults tbody').append(
        `<tr>
            <td>${p.processID}</td>
            <td>${p.arrivalTime}</td>
            <td>${p.burstTime}</td>
            <td>${p.completedTime}</td>
            <td>${p.waitingTime}</td>
            <td>${p.turnAroundTime}</td>
        </tr>`
      );
      totalTAT += p.turnAroundTime;
      totalWT += p.waitingTime;
      if (p.completedTime > maxCT) maxCT = p.completedTime;
    });
    $('#avgTurnaroundTime').val((totalTAT / list.length).toFixed(2));
    $('#avgWaitingTime').val((totalWT / list.length).toFixed(2));
    $('#throughput').val((list.length / maxCT).toFixed(2));
  }

  function drawGanttChart(data) {
    const ctx = document.getElementById('ganttChart').getContext('2d');
    const startTimes = [];
    let currentTime = 0;
    for (let i = 0; i < data.length; i++) {
      startTimes.push(currentTime);
      currentTime += data[i].burstTime;
    }
   const colors = ['orange', 'white', 'green', 'cyan', 'magenta', 'yellow', 'grey', 'lime', 'gold', 'deepskyblue'];
    const chartData = {
      labels: ['Timeline'],
      datasets: data.map((p, i) => ({
        label: 'P' + p.processID,
        backgroundColor: colors[i % colors.length],
        data: [{ x: [startTimes[i], startTimes[i] + p.burstTime], y: 'Timeline' }]
      }))
    };
    if (window.ganttInstance) window.ganttInstance.destroy();
    window.ganttInstance = new Chart(ctx, {
      type: 'bar',
      data: chartData,
     options: {
  indexAxis: 'y',
  responsive: true,
  plugins: {
    legend: { display: true, position: 'top', labels: { color: 'black' } }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: {
        color: 'black'
      },
      ticks: {
        color: 'black'
      }
    },
    y: {
      grid: {
        color: 'black'
      },
      ticks: {
        color: 'black'
      }
    }
  }
}

    });
  }

  function firstComeFirstServed() {
    var time = 0, queue = [], completedList = [];
    while (processList.length > 0 || queue.length > 0) {
      while (queue.length === 0 && processList.length > 0) {
        time++;
        addToQueue();
      }
      function addToQueue() {
        for (var i = 0; i < processList.length; i++) {
          if (time >= processList[i].arrivalTime) {
            queue.push(processList.splice(i--, 1)[0]);
          }
        }
      }
      if (queue.length > 0) {
        var process = queue.shift();
        time += process.burstTime;
        process.completedTime = time;
        process.turnAroundTime = process.completedTime - process.arrivalTime;
        process.waitingTime = process.turnAroundTime - process.burstTime;
        completedList.push(process);
      }
    }
    updateTableAndMetrics(completedList);
    drawGanttChart(completedList);
  }

  function shortestJobFirst() {
    var time = 0, queue = [], completedList = [];
    while (processList.length > 0 || queue.length > 0) {
      processList.forEach((p, i) => {
        if (p.arrivalTime <= time) {
          queue.push(processList.splice(i--, 1)[0]);
        }
      });
      if (queue.length === 0) {
        time++;
        continue;
      }
      queue.sort((a, b) => a.burstTime - b.burstTime);
      var process = queue.shift();
      time += process.burstTime;
      process.completedTime = time;
      process.turnAroundTime = time - process.arrivalTime;
      process.waitingTime = process.turnAroundTime - process.burstTime;
      completedList.push(process);
    }
    updateTableAndMetrics(completedList);
    drawGanttChart(completedList);
  }

  function shortestRemainingTimeFirst() {
    var time = 0, queue = [], completedList = [], executing = null;
    var original = [...processList.map(p => ({ ...p }))];
    while (processList.length > 0 || queue.length > 0 || executing) {
      processList.forEach((p, i) => {
        if (p.arrivalTime === time) {
          queue.push(processList.splice(i--, 1)[0]);
        }
      });
      if (executing) queue.push(executing);
      queue.sort((a, b) => a.burstTime - b.burstTime);
      executing = queue.shift();
      if (executing) {
        executing.burstTime--;
        if (executing.burstTime === 0) {
          executing.completedTime = time + 1;
          completedList.push(executing);
          executing = null;
        }
      }
      time++;
    }
    completedList.forEach(p => {
      var originalP = original.find(x => x.processID === p.processID);
      p.burstTime = originalP.burstTime;
      p.turnAroundTime = p.completedTime - p.arrivalTime;
      p.waitingTime = p.turnAroundTime - p.burstTime;
    });
    updateTableAndMetrics(completedList);
    drawGanttChart(completedList);
  }

  function roundRobin() {
    var tq = parseInt($('#timeQuantum').val()), time = 0, queue = [], completedList = [], original = [...processList.map(p => ({ ...p }))];
    while (processList.length > 0 || queue.length > 0) {
      processList.forEach((p, i) => {
        if (p.arrivalTime <= time) {
          queue.push(processList.splice(i--, 1)[0]);
        }
      });
      if (queue.length === 0) {
        time++;
        continue;
      }
      var p = queue.shift();
      var execTime = Math.min(p.burstTime, tq);
      p.burstTime -= execTime;
      time += execTime;
      processList.forEach((proc, i) => {
        if (proc.arrivalTime <= time) {
          queue.push(processList.splice(i--, 1)[0]);
        }
      });
      if (p.burstTime > 0) queue.push(p);
      else {
        p.completedTime = time;
        completedList.push(p);
      }
    }
    completedList.forEach(p => {
      var originalP = original.find(x => x.processID === p.processID);
      p.burstTime = originalP.burstTime;
      p.turnAroundTime = p.completedTime - p.arrivalTime;
      p.waitingTime = p.turnAroundTime - p.burstTime;
    });
    updateTableAndMetrics(completedList);
    drawGanttChart(completedList);
  }

  function priorityScheduling() {
    var time = 0, queue = [], completedList = [];
    while (processList.length > 0 || queue.length > 0) {
      processList.forEach((p, i) => {
        if (p.arrivalTime <= time) {
          queue.push(processList.splice(i--, 1)[0]);
        }
      });
      if (queue.length === 0) {
        time++;
        continue;
      }
      queue.sort((a, b) => a.priority - b.priority);
      var process = queue.shift();
      time += process.burstTime;
      process.completedTime = time;
      process.turnAroundTime = time - process.arrivalTime;
      process.waitingTime = process.turnAroundTime - process.burstTime;
      completedList.push(process);
    }
    updateTableAndMetrics(completedList);
    drawGanttChart(completedList);
  }

  function multiLevelQueueScheduling() {
    let queue1 = [], queue2 = [], completed = [], time = 0;
    let tq = 3;
    processList.forEach(p => {
      if (p.queue === 1) queue1.push({ ...p });
      else queue2.push({ ...p });
    });
    let allProcesses = [...queue1.map(p => ({ ...p })), ...queue2.map(p => ({ ...p }))];
    while (queue1.length > 0 || queue2.length > 0) {
      if (queue1.length > 0) {
        let p = queue1.shift();
        let execTime = Math.min(p.burstTime, tq);
        p.burstTime -= execTime;
        time += execTime;
        if (p.burstTime > 0) queue1.push(p);
        else {
          p.completedTime = time;
          completed.push(p);
        }
      } else if (queue2.length > 0) {
        let p = queue2.shift();
        time = Math.max(time, p.arrivalTime);
        time += p.burstTime;
        p.completedTime = time;
        completed.push(p);
      } else {
        time++;
      }
    }
    completed.forEach(p => {
      let original = allProcesses.find(x => x.processID === p.processID);
      p.burstTime = original.burstTime;
      p.turnAroundTime = p.completedTime - p.arrivalTime;
      p.waitingTime = p.turnAroundTime - p.burstTime;
    });
    updateTableAndMetrics(completed);
    drawGanttChart(completed);
  }
});


  $('#btnShowSummary').on('click', function () {
    $('#summarySection').fadeIn();
    $('#btnShowSummaryWrapper').hide();
  });
