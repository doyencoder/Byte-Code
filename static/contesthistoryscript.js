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

        // Populate table with contest history
        contestHistory.forEach((contest, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${formatDate(contest.date)}</td>
                <td>${contest.duration} hr</td>
                <td>${contest.totalQuestions}</td>
                <td>${renderProblemRating(contest.questions[0])}</td>
                <td>${renderProblemRating(contest.questions[1] || null)}</td>
                <td>${renderProblemRating(contest.questions[2] || null)}</td>
                <td>${renderProblemRating(contest.questions[3] || null)}</td>
                <td>${renderProblemRating(contest.questions[4] || null)}</td>
                <td>${renderProblemRating(contest.questions[5] || null)}</td>
                <td>${contest.totalPenalty}</td>
                <td>${contest.attemptedQuestions}</td>
            `;
            contestHistoryBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching contest history:', error);
        contestHistoryBody.innerHTML = `
            <tr>
                <td colspan="12">Error loading contest history. Please try again later.</td>
            </tr>
        `;
    }
});

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Helper function to render problem rating with null check
function renderProblemRating(problem) {
    return problem && problem.rating 
        ? `<a href="${problem.link}" target="_blank">${problem.rating}</a>` 
        : '-';
}