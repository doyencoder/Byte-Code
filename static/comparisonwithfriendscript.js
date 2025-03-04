document.addEventListener('DOMContentLoaded', function() {
    const friendDropdown = document.getElementById('friendDropdown');
    const contestDropdown = document.getElementById('contestDropdown');
    const leaderboardTitle = document.getElementById('leaderboardTitle');
    const leaderboardBody = document.getElementById('leaderboardBody');

    // Simulated friends list (would be fetched from backend)
    const friends = [
        { handle: 'tourist', contests: ['CF Round 123', 'CF Round 456'] },
        { handle: 'jiangly', contests: ['CF Round 123', 'Educational Round 75'] },
        { handle: 'Benq', contests: ['CF Round 456', 'Educational Round 75'] }
    ];

    // Simulated contest data (would be fetched from backend)
    const contestData = {
        'CF Round 123': {
            problems: ['A', 'B', 'C', 'D', 'E'],
            standings: [
                { 
                    rank: 1, 
                    handle: 'tourist', 
                    score: 5, 
                    penalty: 100,
                    problemScores: ['+', '+', '+', '+', '+']
                },
                { 
                    rank: 2, 
                    handle: 'jiangly', 
                    score: 4, 
                    penalty: 200,
                    problemScores: ['+', '+', '+', '+', '-']
                }
            ]
        },
        'CF Round 456': {
            problems: ['A', 'B', 'C', 'D', 'E'],
            standings: [
                { 
                    rank: 1, 
                    handle: 'Benq', 
                    score: 5, 
                    penalty: 150,
                    problemScores: ['+', '+', '+', '+', '+']
                }
            ]
        }
    };

    // Populate friends dropdown
    friends.forEach(friend => {
        const option = document.createElement('option');
        option.value = friend.handle;
        option.textContent = friend.handle;
        friendDropdown.appendChild(option);
    });

    // Friend dropdown change event
    friendDropdown.addEventListener('change', function() {
        // Reset contest dropdown
        contestDropdown.innerHTML = '<option value="">Select a Contest</option>';
        contestDropdown.disabled = true;

        const selectedFriend = this.value;
        if (selectedFriend) {
            // Find contests for the selected friend
            const friendContests = friends.find(f => f.handle === selectedFriend).contests;
            
            // Populate contest dropdown
            friendContests.forEach(contest => {
                const option = document.createElement('option');
                option.value = contest;
                option.textContent = contest;
                contestDropdown.appendChild(option);
            });

            contestDropdown.disabled = false;
        }
    });

    // Contest dropdown change event
    contestDropdown.addEventListener('change', function() {
        const selectedContest = this.value;
        if (selectedContest) {
            // Update leaderboard title
            leaderboardTitle.textContent = `${selectedContest} - Standings`;

            // Get contest data
            const contest = contestData[selectedContest];

            // Dynamically create table header with problem columns
            const thead = document.querySelector('.leaderboard-table thead tr');
            
            // Remove existing problem columns
            while (thead.children.length > 4) {
                thead.removeChild(thead.lastChild);
            }

            // Add problem columns
            contest.problems.forEach(problem => {
                const th = document.createElement('th');
                th.textContent = problem;
                th.classList.add('problem-cell');
                thead.appendChild(th);
            });

            // Populate leaderboard
            leaderboardBody.innerHTML = contest.standings.map(entry => `
                <tr>
                    <td>${entry.rank}</td>
                    <td>${entry.handle}</td>
                    <td>${entry.score}</td>
                    <td>${entry.penalty}</td>
                    ${entry.problemScores.map(score => `
                        <td class="${score === '+' ? 'user-score-highlight' : ''}">${score}</td>
                    `).join('')}
                </tr>
            `).join('');
        }
    });
});

// Logout functionality (same as before)
document.addEventListener("DOMContentLoaded", function () {
    const logoutBtn = document.getElementById("logoutbtn");
    logoutBtn.addEventListener("click", async function () {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/auth/logout", { method: "POST" });
            if (!response.ok) {
                throw new Error("Failed to logout");
            }
            localStorage.removeItem("token");
            alert("You have been logged out!");
            window.location.href = "base.html";
        } catch (error) {
            console.error("Logout failed", error);
            alert("Error logging out. Please try again.");
        }
    });
});