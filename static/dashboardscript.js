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

    // Replace the placeholder fetchProblemStats function with this implementation
    async function fetchProblemStats(handle) {
        try {
            // Show loading state for difficulty chart
            const difficultyChartContainer = document.querySelector('.chart-container:nth-child(2)');
            difficultyChartContainer.innerHTML = '<h2>Problem Difficulty Distribution</h2><div class="loading">Loading problem data...</div>';
            difficultyChartContainer.innerHTML += '<canvas id="difficultyChart"></canvas>';
            
            console.log("Fetching solved problems for handle:", handle);
            
            // Get solved problems from our backend API
            const response = await fetch(`http://127.0.0.1:5000/api/codeforces/solved-problems/${handle}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });
            
            console.log("API response status for solved problems:", response.status);
            
            if (!response.ok) {
                throw new Error("Failed to fetch solved problems");
            }
            
            const solvedProblems = await response.json();
            console.log("Solved problems data received:", solvedProblems);
            
            // Remove loading message
            const loadingElement = difficultyChartContainer.querySelector('.loading');
            if (loadingElement) loadingElement.remove();
            
            // Process and display the data
            if (solvedProblems && solvedProblems.length > 0) {
                updateDifficultyChart(solvedProblems);
            } else {
                // No problems solved
                difficultyChartContainer.querySelector('h2').textContent = 'Problem Difficulty Distribution (No problems found)';
                initializeEmptyDifficultyChart();
            }
        } catch (error) {
            console.error("Error fetching solved problems:", error);
            // Show error in chart container
            const difficultyChartContainer = document.querySelector('.chart-container:nth-child(2)');
            difficultyChartContainer.innerHTML = '<h2>Problem Difficulty Distribution</h2><div class="error">Failed to load problem data</div>';
            difficultyChartContainer.innerHTML += '<canvas id="difficultyChart"></canvas>';
            initializeEmptyDifficultyChart();
        }
    }

    // Function to update the difficulty distribution chart
    function updateDifficultyChart(problems) {
        // First, filter out problems that don't have a rating
        const ratedProblems = problems.filter(problem => problem.rating);
        
        if (ratedProblems.length === 0) {
            initializeEmptyDifficultyChart();
            document.querySelector('.chart-container:nth-child(2) h2').textContent = 
                'Problem Difficulty Distribution (No rated problems found)';
            return;
        }
        
        // Define difficulty ranges and their labels
        const difficultyRanges = [
            { min: 800, max: 899, label: '800' },
            { min: 900, max: 999, label: '900' },
            { min: 1000, max: 1099, label: '1000' },
            { min: 1100, max: 1199, label: '1100' },
            { min: 1200, max: 1299, label: '1200' },
            { min: 1300, max: 1399, label: '1300' },
            { min: 1400, max: 1499, label: '1400' },
            { min: 1500, max: 1599, label: '1500' },
            { min: 1600, max: 1699, label: '1600' },
            { min: 1700, max: 1799, label: '1700' },
            { min: 1800, max: 1899, label: '1800' },
            { min: 1900, max: 1999, label: '1900' },
            { min: 2000, max: 2099, label: '2000' },
            { min: 2100, max: 2199, label: '2100' },
            { min: 2200, max: 2299, label: '2200' },
            { min: 2300, max: 2399, label: '2300' },
            { min: 2400, max: 2499, label: '2400' },
            { min: 2500, max: 2599, label: '2500' },
            { min: 2600, max: 2699, label: '2600' },
            { min: 2700, max: 2799, label: '2700' },
            { min: 2800, max: 2899, label: '2800' },
            { min: 2900, max: 2999, label: '2900' },
            { min: 3000, max: 3500, label: '3000+' }
        ];
        
        // Count problems in each range
        const distributionData = difficultyRanges.map(range => {
            return {
                label: range.label,
                count: ratedProblems.filter(problem => 
                    problem.rating >= range.min && 
                    (range.max === 3500 ? problem.rating >= range.min : problem.rating <= range.max)
                ).length
            };
        });
        
        // Filter out empty ranges to keep chart clean
        const nonEmptyDistribution = distributionData.filter(item => item.count > 0);
        
        // If after filtering out empty ranges we have no data, show empty chart
        if (nonEmptyDistribution.length === 0) {
            initializeEmptyDifficultyChart();
            return;
        }
        
        // Colors for different difficulty levels (matching Codeforces colors)
        const backgroundColors = nonEmptyDistribution.map(item => {
            const rangeMidpoint = parseInt(item.label.split('-')[0]) + 100;
            return getDifficultyColor(rangeMidpoint);
        });
        
        // Free up existing chart if it exists
        if (window.difficultyChart instanceof Chart) {
            window.difficultyChart.destroy();
        }
        
        // Create a bar chart for difficulty distribution
        const difficultyCtx = document.getElementById('difficultyChart').getContext('2d');
        window.difficultyChart = new Chart(difficultyCtx, {
            type: 'bar',
            data: {
                labels: nonEmptyDistribution.map(item => item.label),
                datasets: [{
                    label: 'Problems Solved',
                    data: nonEmptyDistribution.map(item => item.count),
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => color.replace('0.7', '1')),
                    borderWidth: 1
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
                            label: function(context) {
                                return `Problems solved: ${context.raw}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        },
                        title: {
                            display: true,
                            text: 'Number of Problems'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Difficulty Rating'
                        }
                    }
                }
            }
        });
    }

    // Get color for a difficulty rating
    function getDifficultyColor(rating) {
        if (rating < 1200) return 'rgba(128, 128, 128, 0.7)'; // Gray
        if (rating < 1400) return 'rgba(0, 128, 0, 0.7)';     // Green
        if (rating < 1600) return 'rgba(3, 168, 158, 0.7)';   // Cyan
        if (rating < 1900) return 'rgba(0, 0, 255, 0.7)';     // Blue
        if (rating < 2100) return 'rgba(170, 0, 170, 0.7)';   // Purple
        if (rating < 2400) return 'rgba(255, 140, 0, 0.7)';   // Orange
        if (rating < 2600) return 'rgba(255, 0, 0, 0.7)';     // Red
        if (rating < 3000) return 'rgba(200, 0, 0, 0.7)';     // Dark Red
        return 'rgba(150, 0, 0, 0.7)';                       // Darker Red
    }

    // Initialize empty difficulty chart
    function initializeEmptyDifficultyChart() {
        if (window.difficultyChart instanceof Chart) {
            window.difficultyChart.destroy();
        }
        
        const difficultyCtx = document.getElementById('difficultyChart').getContext('2d');
        window.difficultyChart = new Chart(difficultyCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Problems Solved',
                    data: [],
                    backgroundColor: 'rgba(54, 81, 148, 0.7)',
                    borderColor: 'rgba(54, 81, 148, 1)',
                    borderWidth: 1
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
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    // Add to the initialization function
    function initializeEmptyCharts() {
        initializeEmptyRatingChart();
        initializeEmptyDifficultyChart();
        // We'll add other empty charts as we implement them
    }

    // Placeholder for fetching submission statistics
    async function fetchSubmissionStats(handle) {
        // Will be implemented later
    }

    // Start by fetching the user profile
    fetchUserProfile();
});