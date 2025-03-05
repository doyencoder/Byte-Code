async function createRatingChart() {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No token found');
            return;
        }

        const response = await fetch('http://localhost:5000/api/contest/ratings', {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch contest ratings');
        }

        const ratingData = await response.json();

        // If no rating data, hide the chart and show a message
        if (ratingData.length === 0) {
            const chartContainer = document.getElementById('chartContainer');
            if (chartContainer) {
                chartContainer.innerHTML = `
                    <p style="color: gray; text-align: center; padding: 20px;">
                        No contest history available. Participate in contests to track your rating.
                    </p>
                `;
            }
            return;
        }

        // Ensure the first point is always 100 by adding an initial point
        const fullRatingData = [
            { 
                date: ratingData[0].date, 
                rating: 100 
            },
            ...ratingData
        ];

        // Modify labels to match full rating data
        const labels = fullRatingData.map(data => new Date(data.date).toLocaleDateString('en-GB'));

        // Create Chart.js chart
        const ctx = document.getElementById('ratingChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Contest Rating',
                    data: fullRatingData.map(data => data.rating),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    pointBackgroundColor: 'rgb(75, 192, 192)',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Your Contest Ratings Over Time'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                const dataIndex = context.dataIndex;
                                const rating = context.parsed.y;
                                const date = labels[dataIndex];
                                return `Rating: ${rating} on ${date}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Rating'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Contest Date'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating rating chart:', error);
        const chartContainer = document.getElementById('chartContainer');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <p style="color: red; text-align: center;">
                    Failed to load contest ratings: ${error.message}
                </p>
            `;
        }
    }
}


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
    await createRatingChart();
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