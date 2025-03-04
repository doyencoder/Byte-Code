document.addEventListener('DOMContentLoaded', function() {
    const friendDropdown = document.getElementById('friendDropdown');
    const contestDropdown = document.getElementById('contestDropdown');
    const leaderboardTitle = document.getElementById('leaderboardTitle');
    const leaderboardBody = document.getElementById('leaderboardBody');

    // Fetch user's friends list
    async function fetchFriendsList() {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("You're not logged in. Redirecting to login page.");
                window.location.href = "login.html";
                return;
            }
    
            const response = await fetch("http://localhost:5000/api/friends/list", {
                headers: { "Authorization": token }
            });
    
            if (!response.ok) throw new Error("Failed to fetch friends");
    
            const friends = await response.json();
            
            friendDropdown.innerHTML = '<option value="">Select a Friend</option>';
            friends.forEach(friend => {
                const option = document.createElement('option');
                option.value = friend.handle;
                option.textContent = friend.handle;
                friendDropdown.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching friends:", error);
            alert("Failed to load friends.");
        }
    }
    
    // Event listener for friend selection
    friendDropdown.addEventListener('change', function() {
        const selectedFriend = this.value;
        contestDropdown.innerHTML = '<option value="">Select a Contest</option>';
        contestDropdown.disabled = true;
        
        if (selectedFriend) fetchCommonContests(selectedFriend);
    });
    

    async function fetchCommonContests(friendHandle) {
        try {
            const token = localStorage.getItem("token");
            console.log("Fetching common contests for:", friendHandle);
    
            const response = await fetch("http://localhost:5000/api/comparison/common-contests", {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token
                },
                body: JSON.stringify({ friendHandle }) // Send friend handle
            });
    
            if (!response.ok) throw new Error("Failed to fetch common contests");
    
            const contests = await response.json();
            console.log("Received common contests:", contests);
    
            contestDropdown.innerHTML = '<option value="">Select a Contest</option>';
            contestDropdown.disabled = false;
    
            contests.forEach(contest => {
                const option = document.createElement('option');
                option.value = contest.contestId;
                option.textContent = `Contest ${contest.contestId}`;
                contestDropdown.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching common contests:", error);
            alert("Failed to load common contests.");
        }
    }
    
    // Event listener for contest selection
    contestDropdown.addEventListener('change', function() {
        const selectedContest = this.value;
        const selectedFriend = friendDropdown.value;
    
        if (selectedContest && selectedFriend) fetchContestStandings(selectedContest, selectedFriend);
    });
    
    

    // Fetch and display contest standings
    async function fetchContestStandings(contestId, friendHandle) {
        try {
            const token = localStorage.getItem("token");
            console.log(`Fetching standings for contest ${contestId}...`);
            
            // Fetch current user's data
            const userresponse = await fetch("http://127.0.0.1:5000/api/codeforces/fetch-user", {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });
    
            if (!userresponse.ok) {
                throw new Error("Failed to fetch user data");
            }
    
            const userData = await userresponse.json();
            const userHandle = userData.handle;
    
            // Fetch contest standings
            const response = await fetch(`http://localhost:5000/api/comparison/contest-standings?contestId=${contestId}&handles=${friendHandle};${userHandle}`, {
                headers: { "Authorization": token }
            });
    
            if (!response.ok) throw new Error("Failed to fetch contest standings");
    
            const data = await response.json();
            console.log("Contest standings:", data);
    
            // Update leaderboard title
            leaderboardTitle.textContent = `Contest ${contestId} Leaderboard`;
    
            // Clear previous leaderboard data
            leaderboardBody.innerHTML = '';
    
            // Determine problem columns dynamically
            const problems = data.problems;
            const problemHeaders = document.querySelector('#leaderboardTable thead tr');
            
            // Remove existing problem headers (if any)
            while (problemHeaders.children.length > 4) {
                problemHeaders.removeChild(problemHeaders.lastChild);
            }
    
            // Add problem headers
            problems.forEach((problem, index) => {
                const problemHeader = document.createElement('th');
                problemHeader.textContent = `Problem ${String.fromCharCode(65 + index)}`;
                problemHeader.classList.add('problem-cell');
                problemHeaders.appendChild(problemHeader);
            });
    
            // Process and sort participants
            const participants = data.rows;
            participants.sort((a, b) => {
                // Sort by points (descending), then by penalty (ascending)
                if (b.points !== a.points) return b.points - a.points;
                return a.penalty - b.penalty;
            });
    
            // Populate leaderboard
            participants.forEach((participant, index) => {
                const row = document.createElement('tr');
                
                // Rank cell
                const rankCell = document.createElement('td');
                rankCell.textContent = index + 1;
                row.appendChild(rankCell);
    
                // Handle cell
                const handleCell = document.createElement('td');
                handleCell.textContent = participant.party.members[0].handle;
                
                // Highlight the current user and friend
                if (participant.party.members[0].handle === userHandle) {
                    handleCell.classList.add('user-score-highlight');
                } else if (participant.party.members[0].handle === friendHandle) {
                    handleCell.classList.add('user-score-highlight');
                }
                row.appendChild(handleCell);
    
                // Score cell
                const scoreCell = document.createElement('td');
                scoreCell.textContent = participant.points.toFixed(2);
                row.appendChild(scoreCell);
    
                // Penalty cell
                const penaltyCell = document.createElement('td');
                penaltyCell.textContent = participant.penalty;
                row.appendChild(penaltyCell);
    
                // Problem cells
                participant.problemResults.forEach(problemResult => {
                    const problemCell = document.createElement('td');
                    problemCell.classList.add('problem-cell');
                    
                    if (problemResult.points > 0) {
                        problemCell.textContent = `+${problemResult.points > 0 ? problemResult.rejectedAttemptCount : ''}`;
                        problemCell.classList.add('solved');
                    } else if (problemResult.rejectedAttemptCount > 0) {
                        problemCell.textContent = `-${problemResult.rejectedAttemptCount}`;
                        problemCell.classList.add('attempted');
                    }
                    
                    row.appendChild(problemCell);
                });
    
                leaderboardBody.appendChild(row);
            });
    
        } catch (error) {
            console.error("Error fetching contest standings:", error);
            alert("Failed to load contest standings.");
        }
    }
    
    
    

    // Initial load of friends list
    fetchFriendsList();

    

    // Logout functionality
    document.getElementById("logoutbtn").addEventListener("click", async function () {
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