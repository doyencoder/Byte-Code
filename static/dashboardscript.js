document.addEventListener('DOMContentLoaded', function() {
    // Get the JWT token from localStorage
    const token = localStorage.getItem("token");
    
    // If no token, redirect to login page
    if (!token) {
        alert("You must log in to view your dashboard");
        window.location.href = "login.html";
        return;
    }

    // Function to fetch user profile data
    async function fetchUserProfile() {
        try {
            const response = await fetch("http://127.0.0.1:5000/api/codeforces/fetch-user", {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });
            
            if (!response.ok) {
                // console.log("caca");
                throw new Error("Failed to fetch user data");
            }
            
            const userData = await response.json();
            updateUserStats(userData);
            
            // If user has a handle, fetch additional Codeforces data
            if (userData.handle && userData.handle !== "Not linked") {
                fetchRatingHistory(userData.handle);
                fetchProblemStats(userData.handle);
                fetchSubmissionStats(userData.handle);
            } else {
                // Show a message if Codeforces account is not linked
                document.querySelector('.dashboard-container h1').textContent = 'Link your Codeforces handle to see analytics';
                document.querySelector('.dashboard-container').innerHTML += 
                    '<div class="alert" style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin-top: 20px; text-align: center;">' +
                    'Please go to your profile page and link your Codeforces handle to see your analytics.' +
                    '</div>';
                
                // Initialize empty charts as we have no data
                initializeEmptyCharts();
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            alert("Failed to load user data. Please try again later.");
            initializeEmptyCharts();
        }
    }

    // Function to update user stats in the UI
    function updateUserStats(userData) {
        // Update user handle
        document.querySelector('.stats-overview .stat-card:nth-child(1) .stat-value').textContent = 
            userData.handle !== "Not linked" ? userData.handle : "Not linked";
        
        // Update current rating
        const ratingElement = document.querySelector('.stats-overview .stat-card:nth-child(2) .stat-value');
        const ratingTitleElement = document.querySelector('.stats-overview .stat-card:nth-child(2) .rating-title');
        
        if (userData.rating && userData.rating !== "N/A") {
            ratingElement.textContent = userData.rating;
            ratingTitleElement.textContent = userData.rank || "Unrated";
            // Set color based on rank
            ratingTitleElement.style.color = getRankColor(userData.rank);
        } else {
            ratingElement.textContent = "N/A";
            ratingTitleElement.textContent = "Unrated";
        }
        
        // We'll update days active later when we have that data
        
        // Update max rating
        const maxRatingElement = document.querySelector('.stats-overview .stat-card:nth-child(4) .stat-value');
        const maxRankElement = document.querySelector('.stats-overview .stat-card:nth-child(4) .rating-title');
        
        if (userData.maxRating && userData.maxRating !== "N/A") {
            maxRatingElement.textContent = userData.maxRating;
            maxRankElement.textContent = userData.maxRank || "Unrated";
            // Set color based on max rank
            maxRankElement.style.color = getRankColor(userData.maxRank);
        } else {
            maxRatingElement.textContent = "N/A";
            maxRankElement.textContent = "Unrated";
        }
    }
    
    // Function to get color based on Codeforces rank
    function getRankColor(rank) {
        if (!rank) return "#000000";
        rank = rank.toLowerCase();
        if (rank.includes("newbie")) return "#CCCCCC";
        if (rank.includes("pupil")) return "#77FF77";
        if (rank.includes("specialist")) return "#77DDBB";
        if (rank.includes("expert")) return "#AAAAFF";
        if (rank.includes("candidate master")) return "#FF88FF";
        if (rank.includes("master")) return "#FFCC88";
        if (rank.includes("grandmaster")) return "#FF7777";
        if (rank.includes("international grandmaster")) return "#FF3333";
        if (rank.includes("legendary grandmaster")) return "#AA0000";
        return "#000000";
    }

    // Function to fetch rating history from Codeforces API
    async function fetchRatingHistory(handle) {
        try {
            // Show loading state
            const chartContainer = document.querySelector('.chart-container:nth-child(1)');
            chartContainer.innerHTML = '<h2>Rating History</h2><div class="loading">Loading rating data...</div>';
            chartContainer.innerHTML += '<canvas id="ratingChart"></canvas>';

            console.log("Fetching rating history for handle:", handle);
            console.log("Using token:", token);
            
            // Get rating history from our backend API
            const response = await fetch(`http://127.0.0.1:5000/api/codeforces/rating-history/${handle}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });

            console.log("API response status:", response.status);

            if (!response.ok) {
                throw new Error("Failed to fetch rating history");
            }

            const ratingData = await response.json();
            console.log("Rating data received:", ratingData);
            
            // Remove loading message if it exists
            const loadingElement = document.querySelector('.loading');
            if (loadingElement) loadingElement.remove();
            
            // If we have data, update the chart
            if (ratingData && ratingData.length > 0) {
                console.log("WORKING TILL HERE");
                updateRatingChart(ratingData);
                
                calculateDaysActive(ratingData);
                
            } else {
                // No contest history
                chartContainer.querySelector('h2').textContent = 'Rating History (No contests found)';
                initializeEmptyRatingChart();
            }
        } catch (error) {
            console.error("Error fetching rating history:", error);
            // Show error in chart container
            const chartContainer = document.querySelector('.chart-container:nth-child(1)');
            chartContainer.innerHTML = '<h2>Rating History</h2><div class="error">Failed to load rating data</div>';
            chartContainer.innerHTML += '<canvas id="ratingChart"></canvas>';
            initializeEmptyRatingChart();
        }
    }

    // Function to update the rating chart with actual rating history
    function updateRatingChart(ratingData) {
        if (!ratingData || ratingData.length === 0) {
            console.log("No rating data available");
            initializeEmptyRatingChart();
            return;
        }

        // Sort rating data by time (ascending)
        ratingData.sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);

        // Prepare data for the chart
        const labels = ratingData.map(entry => {
            // Convert timestamp to date
            const date = new Date(entry.ratingUpdateTimeSeconds * 1000);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        });

        

        const ratings = ratingData.map(entry => entry.newRating);
        
        // Get the initial rating (for the first contest)
        const initialRating = ratingData.length > 0 ? ratingData[0].oldRating : 1500;
        
        // Add the initial rating point if there's contest history
        if (ratingData.length > 0) {
            // Calculate a date slightly before the first contest
            const firstContestDate = new Date(ratingData[0].ratingUpdateTimeSeconds * 1000);
            const initialDate = new Date(firstContestDate);
            initialDate.setDate(initialDate.getDate() - 7); // 1 week before first contest
            
            // Add the initial rating point at the beginning
            labels.unshift(initialDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }));
            ratings.unshift(initialRating);
        }
        
        // Get the minimum and maximum ratings for better y-axis scaling
        const minRating = Math.max(0, Math.min(...ratings) - 100);
        const maxRating = Math.max(...ratings) + 100;

        // Get background colors based on CF ranks
        const backgroundColors = ratings.map(rating => getRatingBackgroundColor(rating));
        const borderColors = ratings.map(rating => getRatingBorderColor(rating));

        // Free up existing chart if it exists

        
        // console.log("wfa");
        // if (window.ratingChart) {
        //     console.log("Chart type:", typeof window.ratingChart);
        //     console.log("Chart is instance of Chart:", window.ratingChart instanceof Chart);
        //     console.log("Chart methods:", Object.getOwnPropertyNames(window.ratingChart));
        //     console.log("Chart prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(window.ratingChart)));
        //     window.ratingChart.destroy();
        //     console.log("WORKING TILL HERE");
        // }

        if (window.ratingChart instanceof Chart) {
            window.ratingChart.destroy();
        }
        

        // Create a new chart
        const ratingCtx = document.getElementById('ratingChart').getContext('2d');
        window.ratingChart = new Chart(ratingCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Rating',
                    data: ratings,
                    backgroundColor: 'rgba(54, 81, 148, 0.1)',
                    borderColor: 'rgba(54, 81, 148, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true,
                    pointBackgroundColor: backgroundColors,
                    pointBorderColor: borderColors,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: function(tooltipItems) {
                                const index = tooltipItems[0].dataIndex;
                                // First point is the initial rating we added
                                if (index === 0 && ratingData.length > 0) {
                                    return 'Initial Rating';
                                }
                                // Adjust index to account for the initial point we added
                                const dataIndex = index - 1;
                                return dataIndex >= 0 && dataIndex < ratingData.length 
                                    ? ratingData[dataIndex].contestName 
                                    : '';
                            },
                            label: function(context) {
                                const index = context.dataIndex;
                                // First point is the initial rating
                                if (index === 0) {
                                    return `Initial Rating: ${context.raw}`;
                                }
                                // Adjust index for ratingData
                                const dataIndex = index - 1;
                                
                                if (dataIndex >= 0 && dataIndex < ratingData.length) {
                                    const ratingChange = ratingData[dataIndex].newRating - ratingData[dataIndex].oldRating;
                                    const sign = ratingChange >= 0 ? '+' : '';
                                    return `Rating: ${context.raw} (${sign}${ratingChange})`;
                                }
                                return `Rating: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: minRating,
                        max: maxRating,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        title: {
                            display: true,
                            text: 'Rating'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Contest Date'
                        }
                    }
                }
            }
        });
    }

    // Function to get background color based on rating
    function getRatingBackgroundColor(rating) {
        if (rating < 1200) return '#CCCCCC'; // Gray (Newbie)
        if (rating < 1400) return '#77FF77'; // Green (Pupil)
        if (rating < 1600) return '#77DDBB'; // Cyan (Specialist)
        if (rating < 1900) return '#AAAAFF'; // Blue (Expert)
        if (rating < 2100) return '#FF88FF'; // Purple (Candidate Master)
        if (rating < 2400) return '#FFCC88'; // Orange (Master)
        if (rating < 2600) return '#FF7777'; // Red (Grandmaster)
        if (rating < 3000) return '#FF3333'; // Red (International Grandmaster)
        return '#AA0000';                    // Dark Red (Legendary Grandmaster)
    }

    // Function to get border color based on rating
    function getRatingBorderColor(rating) {
        if (rating < 1200) return '#888888'; // Gray (Newbie)
        if (rating < 1400) return '#00AA00'; // Green (Pupil)
        if (rating < 1600) return '#00AA88'; // Cyan (Specialist)
        if (rating < 1900) return '#0000FF'; // Blue (Expert)
        if (rating < 2100) return '#AA00AA'; // Purple (Candidate Master)
        if (rating < 2400) return '#FF8800'; // Orange (Master)
        if (rating < 2600) return '#CC0000'; // Red (Grandmaster)
        if (rating < 3000) return '#AA0000'; // Red (International Grandmaster)
        return '#880000';                    // Dark Red (Legendary Grandmaster)
    }

    // Calculate days active based on first and last contest
    function calculateDaysActive(ratingData) {
        if (!ratingData || ratingData.length < 1) {
            // No contest history
            document.querySelector('.stats-overview .stat-card:nth-child(3) .stat-value').textContent = "0";
            return;
        }

        // Sort chronologically
        ratingData.sort((a, b) => a.ratingUpdateTimeSeconds - b.ratingUpdateTimeSeconds);
        
        const firstContestTime = ratingData[0].ratingUpdateTimeSeconds;
        const lastContestTime = ratingData[ratingData.length - 1].ratingUpdateTimeSeconds;
        
        // Calculate days between first and last contest
        const firstDate = new Date(firstContestTime * 1000);
        const lastDate = new Date(lastContestTime * 1000);
        const today = new Date();
        
        // Use the most recent of last contest or today
        const endDate = lastDate > today ? lastDate : today;
        
        const diffTime = Math.abs(endDate - firstDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Update days active stat
        document.querySelector('.stats-overview .stat-card:nth-child(3) .stat-value').textContent = diffDays.toString();
    }

    // Initialize empty charts when no data is available
    function initializeEmptyCharts() {
        initializeEmptyRatingChart();
        // We'll add other empty charts later as we implement them
    }

    // Initialize empty rating chart
    function initializeEmptyRatingChart() {
        if (window.ratingChart instanceof Chart) {
            window.ratingChart.destroy();
        }
        

        const ratingCtx = document.getElementById('ratingChart').getContext('2d');
        window.ratingChart = new Chart(ratingCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Rating',
                    data: [],
                    backgroundColor: 'rgba(54, 81, 148, 0.1)',
                    borderColor: 'rgba(54, 81, 148, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 0,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Placeholder for fetching problem statistics
    async function fetchProblemStats(handle) {
        // Will be implemented later
    }

    // Placeholder for fetching submission statistics
    async function fetchSubmissionStats(handle) {
        // Will be implemented later
    }

    // Start by fetching the user profile
    fetchUserProfile();
});