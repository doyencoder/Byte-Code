document.addEventListener('DOMContentLoaded', () => {
    const contestContainer = document.getElementById('contest-container');

    // Function to format date and time
    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return {
            formattedDate: date.toLocaleDateString(),
            formattedTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    }

    // Function to convert seconds to hours and minutes
    function formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hours ${minutes > 0 ? `${minutes} mins` : ''}`.trim();
    }

    // Fetch upcoming contests
    async function fetchUpcomingContests() {
        try {
            // Replace with your actual API endpoint
            const token = localStorage.getItem("token");
            
            const response = await fetch('http://127.0.0.1:5000/api/codeforces/upcoming-contests', {
                method: 'GET',
                headers: {
                    "Authorization": token, 
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch contests');
            }

            const data = await response.json();

            if (!data.success || !data.contests) {
                throw new Error('No contests data available');
            }

            // Create table for contests
            const table = document.createElement('table');
            table.className = 'contests-table';
            
            // Table header
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Contest Name</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.contests.map(contest => {
                        const { formattedDate, formattedTime } = formatDateTime(contest.startTime);
                        return `
                            <tr>
                                <td>${contest.name}</td>
                                <td>${formattedDate}</td>
                                <td>${formattedTime}</td>
                                <td>${formatDuration(contest.duration)}</td>
                                <td>
                                    <div class="contest-registration">
                                        <button class="register-btn" data-contest-id="${contest.id}">Register</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            `;

            // Clear previous content and add new table
            contestContainer.innerHTML = '';
            contestContainer.appendChild(table);

            // Add event listeners to register buttons
            document.querySelectorAll('.register-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    window.location.href = 'https://codeforces.com/contests';
                });
            });

        } catch (error) {
            console.error('Error fetching contests:', error);
            contestContainer.innerHTML = `
                <div class="error-message">
                    <p>Unable to fetch contests. ${error.message}</p>
                    <button id="retry-fetch">Retry</button>
                </div>
            `;

            // Add retry functionality
            document.getElementById('retry-fetch')?.addEventListener('click', fetchUpcomingContests);
        }
    }
    // Initial fetch of contests
    fetchUpcomingContests();

    // Optional: Refresh contests periodically
    setInterval(fetchUpcomingContests, 5 * 60 * 1000); // Refresh every 5 minutes
});