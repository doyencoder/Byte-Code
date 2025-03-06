document.addEventListener("DOMContentLoaded", function () {
    let contestDuration = parseInt(localStorage.getItem("contestDuration")) || 7200;
    // Use contestEndTime from localStorage
    let contestEndTime = parseInt(localStorage.getItem("contestEndTime")) || (Date.now() + contestDuration * 1000);
    let problemsList = document.getElementById("problems-list");

    async function loadProblems() {
        try {
            const token = localStorage.getItem('token');
            // Load pre-fetched problems
            const problems = JSON.parse(localStorage.getItem('fetchedProblems'));
            problemsList.innerHTML = "";
            problems.forEach((problem, index) => {
                let row = document.createElement("tr");
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td><a href="${problem.link}" target="_blank">${problem.name}</a></td>
                    <td style="background-color: ${getColor(problem.rating)}">${problem.rating}</td>
                    <td style="background-color: lightpink" data-problem-id="${problem.contestId}${problem.index}">${problem.status || 'Pending'}</td>
                `;
                problemsList.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading problems:', error);
            alert('Failed to load problems. Please try again.');
        }
    }

    async function reloadAndUpdateStatus() {
        const token = localStorage.getItem('token');
        let fetchedProblems = JSON.parse(localStorage.getItem('fetchedProblems') || '[]');
        const user = await fetchUserCodeforcesHandle(token);
    
        // Get recent submissions via backend proxy
        let submissions;
        try {
            const statusResponse = await fetch(`/api/contest/user-status?handle=${user.codeforcesHandle}`, {
                headers: { 'Authorization': token }
            });
            submissions = await statusResponse.json();
        } catch (error) {
            console.error("Error fetching submissions via proxy:", error);
            return;
        }
    
        let solvedCount = 0;
        let updatedProblems = [];
    
        fetchedProblems.forEach(problem => {
            const statusCell = document.querySelector(`td[data-problem-id="${problem.contestId}${problem.index}"]`);
            
            // Filter submissions for this specific problem
            const problemSubmissions = submissions.result.filter(submission =>
                submission.problem.contestId === problem.contestId &&
                submission.problem.index === problem.index
            );
            
            let wrongSubmissionCount = 0;
            let acceptedSubmissionTime = null;
            // Get accepted submissions (if any)
            const acceptedSubmissions = problemSubmissions.filter(sub => sub.verdict === 'OK');
            
            if (acceptedSubmissions.length > 0) {
                // Find the earliest accepted submission time
                acceptedSubmissionTime = acceptedSubmissions.reduce((prev, curr) =>
                    prev.creationTimeSeconds < curr.creationTimeSeconds ? prev : curr
                ).creationTimeSeconds;
                
                // Count wrong submissions made before the first accepted one
                wrongSubmissionCount = problemSubmissions.filter(sub =>
                    sub.verdict !== 'OK' && sub.creationTimeSeconds < acceptedSubmissionTime
                ).length;
                
                statusCell.textContent = 'Solved';
                statusCell.style.backgroundColor = 'lightgreen';
                problem.status = 'solved';
                // Save the solved time (convert seconds to milliseconds)
                problem.solvedAt = new Date(acceptedSubmissionTime * 1000);
                solvedCount++;
            } else {
                // If unsolved, count all wrong submissions
                wrongSubmissionCount = problemSubmissions.filter(sub =>
                    sub.verdict !== 'OK'
                ).length;
                statusCell.textContent = 'Pending';
                statusCell.style.backgroundColor = 'lightpink';
                problem.status = 'unsolved';
                problem.solvedAt = null;
            }
            
            // Update the problem object with the computed wrong submission count
            updatedProblems.push({
                problemId: `${problem.contestId}${problem.index}`,
                contestId: problem.contestId,
                index: problem.index,
                rating: problem.rating,
                link: problem.link,
                wrongSubmissionCount: wrongSubmissionCount,
                solvedAt: problem.solvedAt,
                status: problem.status
            });
        });
    
        // Save updated problems locally
        localStorage.setItem('fetchedProblems', JSON.stringify(fetchedProblems));
    
        // Update contest attempt record in DB
        const contestAttemptId = localStorage.getItem("contestAttemptId");
        if (contestAttemptId) {
            try {
                await fetch(`/api/contest/update-problem-status`, {
                    method: "POST",
                    headers: {
                        'Authorization': token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ contestAttemptId, updatedProblems })
                });
            } catch (error) {
                console.error("Error updating contest attempt in DB:", error);
            }
        }
    
        // Auto-end contest if all problems solved
        if (solvedCount === fetchedProblems.length && fetchedProblems.length > 0) {
            alert("Congratulations! You have solved all the problems. The contest will now end.");
            window.location.href = 'contesthistory.html';
        }

        displayICPCLeaderboard();
    }
    

    async function fetchUserCodeforcesHandle(token) {
        const response = await fetch('/api/auth/user', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        return response.json();
    }
    async function fetchUserName(token) {
        try {
          const res = await fetch('/api/user/profile', {
            headers: { 'Authorization': token }
          });
          const data = await res.json();
          return data.name || data.email || 'Unknown';
        } catch (error) {
          console.error("Error fetching user profile:", error);
          return 'Unknown';
        }
    }

    async function displayICPCLeaderboard() {
        try {
          const token = localStorage.getItem('token');
          const contestAttemptId = localStorage.getItem('contestAttemptId');
          if (!contestAttemptId) return; // no active contest attempt
      
          // 1) Fetch contest history
          const response = await fetch(`/api/contest/history`, {
            headers: { 'Authorization': token }
          });
          const attempts = await response.json();
      
          // 2) Find the current contest attempt
          const currentAttempt = attempts.find(a => a._id === contestAttemptId);
          if (!currentAttempt) return;
      
          // 3) Calculate penalty & solved count
          const startTime = new Date(currentAttempt.startTime);
          let totalPenalty = 0;
          let solvedCount = 0;
          const problems = currentAttempt.problems; 
      
          // Build cells for each problem
          const problemCells = problems.map((problem, idx) => {
            const wrongCount = problem.wrongSubmissionCount || 0;
            const isSolved = (problem.status === 'solved');
            let cellText = '';
            let cellColor = 'black';
      
            if (isSolved) {
              solvedCount++;
              // Time in minutes from contest start to solve time
              const solveTimeMins = Math.floor(
                (new Date(problem.solvedAt).getTime() - startTime.getTime()) / 60000
              );
              // ICPC penalty: solve time + 20 mins per wrong submission
              const problemPenalty = solveTimeMins + 20 * wrongCount;
              totalPenalty += problemPenalty;
      
              cellText = (wrongCount === 0) ? '+' : `+${wrongCount}`;
              cellColor = 'green';
            } else {
              if (wrongCount > 0) {
                cellText = `-${wrongCount}`;
                cellColor = 'red';
              }
            }
      
            return `<td style="text-align:center; color:${cellColor}; font-weight:bold;">${cellText}</td>`;
          });
      
          // 4) Update the leaderboard table header
          const tableHeadRow = document.querySelector("#leaderboard-table thead tr");
          // We only have two fixed columns now: Penalty, Solved
          // Remove extra headers beyond those two
          while (tableHeadRow.children.length > 2) {
            tableHeadRow.removeChild(tableHeadRow.lastChild);
          }
          // Dynamically add Q1, Q2, etc.
          problems.forEach((_, idx) => {
            const th = document.createElement('th');
            th.innerText = `Q${idx + 1}`;
            tableHeadRow.appendChild(th);
          });
      
          // 5) Build the single row for the scoreboard
          const rowHtml = `
            <tr>
              <!-- No Name column -->
              <td style="text-align:center;">${totalPenalty}</td>
              <td style="text-align:center;">${solvedCount}</td>
              ${problemCells.join('')}
            </tr>
          `;
      
          // 6) Insert into the leaderboard table body
          const tableBody = document.querySelector("#leaderboard-table tbody");
          tableBody.innerHTML = rowHtml;
      
        } catch (error) {
          console.error("Error building ICPC leaderboard:", error);
        }
    }
      

    function getColor(rating) {
        if (rating < 1200) return "rgb(204, 204, 204)";
        if (rating < 1400) return "rgb(119, 255, 119)";
        if (rating < 1600) return "rgb(119, 221, 187)";
        if (rating < 1900) return "rgb(170, 170, 255)";
        return "violet";
    }

    function updateTimer() {
        let timerElement = document.getElementById("timer");
        function tick() {
            let remainingTime = Math.max(0, Math.floor((contestEndTime - Date.now() + 15) / 1000));
            let hours = Math.floor(remainingTime / 3600);
            let minutes = Math.floor((remainingTime % 3600) / 60);
            let seconds = remainingTime % 60;
            timerElement.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            if (remainingTime > 0) {
                setTimeout(tick, 1000);
            } else {
                // End contest automatically
                endContest(true);
            }
        }
        tick();
    }

    function endContest(isAutomatic = false) {
        // You can send final updates here if needed before redirecting
        if (!isAutomatic) {
            const confirmExit = confirm("Are you sure you want to end the contest? All progress will be saved.");
            if (!confirmExit) return;
        }
        window.location.href = 'contesthistory.html';
    }

    function handleExit(event) {
        const remainingTime = Math.max(0, Math.floor((contestEndTime - Date.now() + 15) / 1000));
        if (remainingTime > 0) {
            const confirmExit = confirm("Are you sure you want to end the contest? All progress will be saved.");
            if (confirmExit) {
                window.location.href = 'contesthistory.html';
                event.preventDefault();
                return false;
            } else {
                event.preventDefault();
                return false;
            }
        }
    }

    window.addEventListener('beforeunload', function (event) {
        const remainingTime = Math.max(0, Math.floor((contestEndTime - Date.now() + 15) / 1000));
        if (remainingTime > 0) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    const navLinks = document.querySelectorAll('a');
    navLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            const href = link.getAttribute('href');
            if (href !== 'contesthistory.html') {
                handleExit(event);
            }
        });
    });

    loadProblems();
    updateTimer();

    // Refresh button to reload problem display (if any)
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadProblems);
    }
    
    // "Reload" button to update submission statuses and update DB
    const reloadBtn = document.getElementById("reload-btn");
    if (reloadBtn) {
        reloadBtn.addEventListener("click", reloadAndUpdateStatus);
    }
    
    // Periodically check statuses every minute
    setInterval(reloadAndUpdateStatus, 80000);
});
