document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const contestHistoryBody = document.getElementById('contest-history-body');

    if (!token) {
        alert('You are not logged in. Redirecting to login page.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:5000/api/contest/history', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch contest history');
        }

        const contestHistory = await response.json();

        if (contestHistory.length === 0) {
            contestHistoryBody.innerHTML = `
                <tr>
                    <td colspan="12">No contest history found.</td>
                </tr>
            `;
            return;
        }

        // Populate table with contest history
        contestHistory.forEach((contest, index) => {
            const { 
                totalPenalty, 
                problemDetails, 
                totalProblems, 
                solvedProblemsCount 
            } = calculateDetailedPenalty(contest);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatDate(contest.startTime)}</td>
                <td>${formatDuration(contest.duration)}</td>
                <td>${totalProblems || 0}</td>
                ${renderProblemColumns(problemDetails)}
                <td>${totalPenalty}</td>
                <td>${solvedProblemsCount || 0}</td>
            `;
            contestHistoryBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching contest history:', error);
        contestHistoryBody.innerHTML = `
            <tr>
                <td colspan="12">Error loading contest history: ${error.message}</td>
            </tr>
        `;
    }
});

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function formatDuration(durationInMinutes) {
    return `${(durationInMinutes / 60).toFixed(1)} hr`;
}

function renderProblemColumns(problems) {
    const maxProblems = 6;
    let problemColumns = '';

    for (let i = 0; i < maxProblems; i++) {
        const problem = problems && problems[i];
        problemColumns += `
            <td>
                ${problem 
                    ? renderProblemCell(problem)
                    : '-'}
            </td>
        `;
    }

    return problemColumns;
}

function renderProblemCell(problem) {
    const isSolved = problem.status === 'solved';
    const hasWrongSubmissions = problem.wrongSubmissionCount > 0;
    
    let cellStyle = '';
    let cellContent = problem.rating || '-';
    
    if (isSolved) {
        cellStyle = 'color: green; font-weight: bold;';
        cellContent += ' ✓';
    } else if (hasWrongSubmissions) {
        cellStyle = 'color: red; font-weight: bold;';
        cellContent += ' ✗';
    }
    
    return `<a href="${problem.link}" target="_blank" style="${cellStyle}">
        ${cellContent}
    </a>`;
}

function calculateDetailedPenalty(contest) {
    if (!contest.problems || !Array.isArray(contest.problems)) {
        return { 
            totalPenalty: 0, 
            problemDetails: [],
            totalProblems: 0,
            solvedProblemsCount: 0
        };
    }

    let totalPenalty = 0;
    let solvedProblemsCount = 0;
    const totalProblems = contest.problems.length;

    const problemDetails = contest.problems.map(problem => {
        if (problem.status === 'solved') {
            solvedProblemsCount++;
            // 20 minutes penalty per wrong submission for solved problems
            const wrongSubmissionPenalty = (problem.wrongSubmissionCount || 0) * 20;
            
            // Calculate minutes to solve (if solvedAt and startTime are available)
            const solveTime = problem.solvedAt ? new Date(problem.solvedAt) : null;
            const startTime = new Date(contest.startTime);
            
            let minutesToSolve = 0;
            if (solveTime) {
                minutesToSolve = Math.round((solveTime - startTime) / (1000 * 60));
            }

            // Total penalty for this problem
            const problemPenalty = minutesToSolve + wrongSubmissionPenalty;
            totalPenalty += problemPenalty;

            return {
                ...problem,
                minutesToSolve,
                wrongSubmissionPenalty
            };
        }
        return problem;
    });

    return { 
        totalPenalty, 
        problemDetails,
        totalProblems,
        solvedProblemsCount
    };
}