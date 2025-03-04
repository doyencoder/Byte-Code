document.addEventListener('DOMContentLoaded', function () {
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
                fetchProblemTags(userData.handle); // Add this line to fetch problem tags
                fetchProblemStats(userData.handle);
                fetchSubmissionStats(userData.handle);
                fetchSubmissionActivity(userData.handle);
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
                            title: function (tooltipItems) {
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
                            label: function (context) {
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

    // Function to fetch problem tags distribution
    async function fetchProblemTags(handle) {

        try {
            // Show loading state
            const chartContainer = document.querySelectorAll('.chart-section')[1].querySelector('.chart-container');

            if (!chartContainer) {
                console.log("Chart container not found, creating it");
                const chartsSection = document.querySelector('.charts-section') || document.body;
                chartContainer = document.createElement('div');
                chartContainer.className = 'chart-container';
                chartsSection.appendChild(chartContainer);
            }

            chartContainer.innerHTML = '<h2>Problem Tags Distribution</h2><div class="loading">Loading problem tags data...</div>';
            console.log("debug1");
            chartContainer.innerHTML += '<canvas id="tagsChart"></canvas>';

            console.log("Fetching problem tags for handle:", handle);

            // Get problem tags from our backend API
            const response = await fetch(`http://127.0.0.1:5000/api/codeforces/problem-tags/${handle}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });

            console.log("Problem tags API response status:", response.status);

            if (!response.ok) {
                throw new Error("Failed to fetch problem tags data");
            }

            const tagsData = await response.json();
            console.log("Problem tags data received:", tagsData);

            // Remove loading message
            const loadingElement = chartContainer.querySelector('.loading');
            if (loadingElement) loadingElement.remove();

            // Update the chart with the data
            if (tagsData && tagsData.tags && tagsData.tags.length > 0) {
                updateProblemTagsChart(tagsData);
            } else {
                // No tags data available
                chartContainer.querySelector('h2').textContent = 'Problem Tags Distribution (No data available)';
                initializeEmptyTagsChart();
            }
        } catch (error) {
            console.error("Error fetching problem tags:", error);
            // Show error in chart container
            const chartContainer = document.querySelector('.chart-container:nth-child(3)');
            chartContainer.innerHTML = '<h2>Problem Tags Distribution</h2><div class="error">Failed to load problem tags data</div>';
            chartContainer.innerHTML += '<canvas id="tagsChart"></canvas>';
            initializeEmptyTagsChart();
        }
    }

    // Function to update the problem tags chart
    function updateProblemTagsChart(tagsData) {
        // Extract tags and their counts
        const tagNames = tagsData.tags.map(item => item.tag);
        const tagCounts = tagsData.tags.map(item => item.count);

        // Generate colors for each tag
        const backgroundColors = generateTagColors(tagNames.length);

        // If an existing chart exists, destroy it
        if (window.tagsChart instanceof Chart) {
            window.tagsChart.destroy();
        }

        // Create the pie chart
        const tagsCtx = document.getElementById('tagsChart').getContext('2d');
        window.tagsChart = new Chart(tagsCtx, {
            type: 'pie',
            data: {
                labels: tagNames,
                datasets: [{
                    data: tagCounts,
                    backgroundColor: backgroundColors,
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            padding: 10,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        // Update the chart title to include total problems solved
        const chartTitle = document.querySelector('.chart-container:nth-child(3) h2');
        chartTitle.textContent = `Problem Tags Distribution (${tagsData.totalSolvedProblems} Problems Solved)`;
    }

    // Function to generate random colors for tags
    function generateTagColors(count) {
        // Predefined colors for common problem tags
        const tagColorMap = {
            'implementation': 'rgba(54, 162, 235, 0.8)',
            'math': 'rgba(255, 99, 132, 0.8)',
            'greedy': 'rgba(255, 206, 86, 0.8)',
            'dp': 'rgba(75, 192, 192, 0.8)',
            'data structures': 'rgba(153, 102, 255, 0.8)',
            'brute force': 'rgba(255, 159, 64, 0.8)',
            'constructive algorithms': 'rgba(199, 199, 199, 0.8)',
            'graphs': 'rgba(83, 180, 153, 0.8)',
            'binary search': 'rgba(255, 99, 71, 0.8)',
            'sortings': 'rgba(189, 195, 199, 0.8)',
            'strings': 'rgba(46, 204, 113, 0.8)',
            'dfs and similar': 'rgba(155, 89, 182, 0.8)',
            'trees': 'rgba(52, 152, 219, 0.8)',
            'number theory': 'rgba(231, 76, 60, 0.8)',
            'combinatorics': 'rgba(241, 196, 15, 0.8)'
        };

        // Generate colors array
        const colors = [];
        for (let i = 0; i < count; i++) {
            if (i < Object.keys(tagColorMap).length) {
                // Use predefined colors first
                colors.push(Object.values(tagColorMap)[i]);
            } else {
                // Generate random colors for any additional tags
                const r = Math.floor(Math.random() * 255);
                const g = Math.floor(Math.random() * 255);
                const b = Math.floor(Math.random() * 255);
                colors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
            }
        }

        return colors;
    }

    // Initialize empty tags chart
    function initializeEmptyTagsChart() {
        if (window.tagsChart instanceof Chart) {
            window.tagsChart.destroy();
        }

        const tagsCtx = document.getElementById('tagsChart').getContext('2d');
        window.tagsChart = new Chart(tagsCtx, {
            type: 'pie',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['rgba(200, 200, 200, 0.8)'],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // Initialize empty charts when no data is available
    function initializeEmptyCharts() {
        initializeEmptyRatingChart();
        initializeEmptyTagsChart();
        // Other empty charts initialization will be added as we implement them
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
                            label: function (context) {
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

    // Function to fetch submission verdict statistics
    async function fetchSubmissionStats(handle) {
        try {
            // Show loading state
            const chartContainer = document.querySelectorAll('.chart-section')[1].querySelectorAll('.chart-container')[1];

            chartContainer.innerHTML = '<h2>Submissions by Verdict</h2><div class="loading">Loading submission data...</div>';
            chartContainer.innerHTML += '<canvas id="verdictChart"></canvas>';

            console.log("Fetching submission verdicts for handle:", handle);

            // Get submission verdicts from our backend API
            const response = await fetch(`http://127.0.0.1:5000/api/codeforces/submission-verdicts/${handle}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });

            console.log("API response status:", response.status);

            if (!response.ok) {
                throw new Error("Failed to fetch submission verdicts");
            }

            const verdictData = await response.json();
            console.log("Verdict data received:", verdictData);

            // Remove loading message if it exists
            const loadingElement = chartContainer.querySelector('.loading');
            if (loadingElement) loadingElement.remove();

            // If we have data, update the chart
            if (verdictData && verdictData.verdicts && verdictData.verdicts.length > 0) {
                updateVerdictChart(verdictData);
            } else {
                // No verdict data
                chartContainer.querySelector('h2').textContent = 'Submissions by Verdict (No submissions found)';
                initializeEmptyVerdictChart();
            }
        } catch (error) {
            console.error("Error fetching submission verdicts:", error);
            // Show error in chart container
            const chartContainer = document.querySelector('.chart-container:nth-child(4)');
            chartContainer.innerHTML = '<h2>Submissions by Verdict</h2><div class="error">Failed to load submission data</div>';
            chartContainer.innerHTML += '<canvas id="verdictChart"></canvas>';
            initializeEmptyVerdictChart();
        }
    }

    // Function to update the verdict chart with actual verdict data
    function updateVerdictChart(verdictData) {
        if (!verdictData || !verdictData.verdicts || verdictData.verdicts.length === 0) {
            console.log("No verdict data available");
            initializeEmptyVerdictChart();
            return;
        }

        // Prepare data for the chart
        const verdicts = verdictData.verdicts;

        // Map Codeforces verdict codes to more readable names
        const verdictNames = {
            'OK': 'Accepted',
            'WRONG_ANSWER': 'Wrong Answer',
            'TIME_LIMIT_EXCEEDED': 'Time Limit',
            'MEMORY_LIMIT_EXCEEDED': 'Memory Limit',
            'RUNTIME_ERROR': 'Runtime Error',
            'COMPILATION_ERROR': 'Compilation Error',
            'SKIPPED': 'Skipped',
            'REJECTED': 'Rejected',
            'PRESENTATION_ERROR': 'Presentation Error',
            'FAILED': 'Failed',
            'PARTIAL': 'Partial',
            'CHALLENGED': 'Challenged',
            'INPUT_PREPARATION_CRASHED': 'Input Crashed',
            'CRASHED': 'Crashed',
            'TESTING': 'Testing',
            'SUBMITTED': 'Submitted'
        };

        // Map verdict codes to colors
        const verdictColors = {
            'OK': '#44BB77',                    // Green
            'WRONG_ANSWER': '#FF5555',          // Red
            'TIME_LIMIT_EXCEEDED': '#FFBB55',   // Orange
            'MEMORY_LIMIT_EXCEEDED': '#FFDD55', // Yellow
            'RUNTIME_ERROR': '#FF88AA',         // Pink
            'COMPILATION_ERROR': '#AAAAFF',     // Light Blue
            'SKIPPED': '#AAAAAA',               // Gray
            'REJECTED': '#BB5555',              // Dark Red
            'PRESENTATION_ERROR': '#DDAA77',    // Light Brown
            'FAILED': '#DD5555',                // Dark Red
            'PARTIAL': '#77BBFF',               // Light Blue
            'CHALLENGED': '#FF77AA',            // Pink
            'INPUT_PREPARATION_CRASHED': '#DDDDDD', // Light Gray
            'CRASHED': '#DD7777',               // Light Red
            'TESTING': '#77DDFF',               // Light Blue
            'SUBMITTED': '#77DDDD'              // Cyan
        };

        // Prepare the data for Chart.js
        const labels = verdicts.map(verdict => verdictNames[verdict.verdict] || verdict.verdict);
        const data = verdicts.map(verdict => verdict.count);
        const backgroundColor = verdicts.map(verdict => verdictColors[verdict.verdict] || '#777777');

        // Free up existing chart if it exists
        if (window.verdictChart instanceof Chart) {
            window.verdictChart.destroy();
        }

        // Create a new pie chart
        const verdictCtx = document.getElementById('verdictChart').getContext('2d');
        window.verdictChart = new Chart(verdictCtx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: '#FFFFFF',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            boxWidth: 15,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round(value / total * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Function to initialize an empty verdict chart
    function initializeEmptyVerdictChart() {
        // Free up existing chart if it exists
        if (window.verdictChart instanceof Chart) {
            window.verdictChart.destroy();
        }

        // Create an empty chart with "No data" message
        const verdictCtx = document.getElementById('verdictChart').getContext('2d');
        window.verdictChart = new Chart(verdictCtx, {
            type: 'pie',
            data: {
                labels: ['No Data'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#DDDDDD'],
                    borderColor: '#FFFFFF',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    },
                    tooltip: {
                        callbacks: {
                            label: function () {
                                return 'No submission data available';
                            }
                        }
                    }
                }
            }
        });
    }
    // Function to initialize empty charts when no data is available
    function initializeEmptyCharts() {
        initializeEmptyRatingChart();
        initializeEmptyVerdictChart();
        // Add other empty chart initializers here as you develop them
    }

    // Function to initialize an empty rating chart
    function initializeEmptyRatingChart() {
        // Free up existing chart if it exists
        if (window.ratingChart instanceof Chart) {
            window.ratingChart.destroy();
        }

        // Create an empty chart with "No data" message
        const ratingCtx = document.getElementById('ratingChart').getContext('2d');
        window.ratingChart = new Chart(ratingCtx, {
            type: 'line',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Rating',
                    data: [0],
                    borderColor: '#CCCCCC',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)'
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

    // First, let's add these new functions to fetch submission activity data and display the heatmap

    // Function to fetch submission activity for heatmap
    async function fetchSubmissionActivity(handle) {
        try {
            // Show loading state
            const heatmapContainer = document.getElementById('activityHeatmap');
            if (heatmapContainer) {
                console.log("Heatmap container found!");
            } else {
                console.error("Heatmap container not found!");
            }
            heatmapContainer.innerHTML = '<div class="loading">Loading submission activity...</div>';

            // Get submission activity from our backend API
            const response = await fetch(`http://127.0.0.1:5000/api/codeforces/submission-activity/${handle}`, {
                method: "GET",
                headers: {
                    "Authorization": token
                }
            });

            if (!response.ok) {
                throw new Error("Failed to fetch submission activity");
            }

            const activityData = await response.json();

            // Remove loading message
            const loadingElement = heatmapContainer.querySelector('.loading');
            if (loadingElement) loadingElement.remove();

            // If we have data, create the heatmap
            if (activityData && activityData.activity && activityData.activity.length > 0) {
                renderSubmissionHeatmap(activityData.activity);
            } else {
                // No submission history
                heatmapContainer.innerHTML = '<div class="no-data">No submission activity found</div>';
            }
        } catch (error) {
            console.error("Error fetching submission activity:", error);
            // Show error in heatmap container
            const heatmapContainer = document.getElementById('activityHeatmap');
            heatmapContainer.innerHTML = '<div class="error">Failed to load submission activity</div>';
        }
    }

    // Function to render the submission heatmap
    function renderSubmissionHeatmap(activityData) {
        const heatmapContainer = document.getElementById('activityHeatmap');
        heatmapContainer.innerHTML = ''; // Clear container

        // Get the dates and counts from the activity data
        const dates = activityData.map(item => new Date(item.date));

        // Find the min and max date in the data
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // Create a map of date to count for quick lookup
        const dateCountMap = {};
        activityData.forEach(item => {
            dateCountMap[item.date] = item.count;
        });

        // Calculate the number of weeks to display (rounded up)
        const weeksDiff = Math.ceil((maxDate - minDate) / (7 * 24 * 60 * 60 * 1000)) + 1;

        // Create the calendar grid
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';

        // Add month labels
        const monthLabelsRow = document.createElement('div');
        monthLabelsRow.className = 'month-labels';

        // Generate all dates between min and max date
        const allDates = [];
        let currentDate = new Date(minDate);
        while (currentDate <= maxDate) {
            allDates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Group dates by month for labels
        const months = [];
        let currentMonth = -1;

        allDates.forEach(date => {
            if (date.getMonth() !== currentMonth) {
                currentMonth = date.getMonth();
                months.push({
                    name: date.toLocaleString('default', { month: 'short' }),
                    startIndex: Math.floor((date - minDate) / (24 * 60 * 60 * 1000) / 7)
                });
            }
        });

        // Create month labels
        months.forEach(month => {
            const monthLabel = document.createElement('div');
            monthLabel.className = 'month-label';
            monthLabel.textContent = month.name;
            monthLabel.style.gridColumnStart = month.startIndex + 1; // +1 for the day labels column
            monthLabelsRow.appendChild(monthLabel);
        });

        calendarGrid.appendChild(monthLabelsRow);

        // Add day of week labels
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayLabelsColumn = document.createElement('div');
        dayLabelsColumn.className = 'day-labels';

        daysOfWeek.forEach(day => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'day-label';
            dayLabel.textContent = day;
            dayLabelsColumn.appendChild(dayLabel);
        });

        calendarGrid.appendChild(dayLabelsColumn);

        // Create the cells grid
        const cellsGrid = document.createElement('div');
        cellsGrid.className = 'cells-grid';
        cellsGrid.style.gridTemplateColumns = `repeat(${weeksDiff}, 1fr)`;

        // Fill in the grid with cells
        for (let i = 0; i < 7; i++) { // 7 days in a week
            for (let j = 0; j < weeksDiff; j++) {
                // Calculate the date for this cell
                const cellDate = new Date(minDate);
                cellDate.setDate(minDate.getDate() + (j * 7) + i - minDate.getDay());

                const dateStr = cellDate.toISOString().split('T')[0];
                const count = dateCountMap[dateStr] || 0;

                const cell = document.createElement('div');
                cell.className = 'heatmap-cell';
                cell.dataset.date = dateStr;
                cell.dataset.count = count;

                // Determine color intensity based on count
                const intensity = getColorIntensity(count);
                cell.style.backgroundColor = intensity;

                // Add tooltip
                cell.title = `${dateStr}: ${count} submissions`;

                cellsGrid.appendChild(cell);
            }
        }

        calendarGrid.appendChild(cellsGrid);
        heatmapContainer.appendChild(calendarGrid);

        // Add a color legend
        addHeatmapLegend(heatmapContainer);
    }

    // Function to determine color intensity based on submission count
    function getColorIntensity(count) {
        if (count === 0) return '#ebedf0';
        if (count < 3) return '#c6e48b';
        if (count < 6) return '#7bc96f';
        if (count < 9) return '#239a3b';
        return '#196127';
    }

    // Function to add a color legend to the heatmap
    function addHeatmapLegend(container) {
        const legend = document.createElement('div');
        legend.className = 'heatmap-legend';

        const legendTitle = document.createElement('span');
        legendTitle.textContent = 'Submissions:';
        legend.appendChild(legendTitle);

        const colorLevels = [
            { color: '#ebedf0', label: '0' },
            { color: '#c6e48b', label: '1-2' },
            { color: '#7bc96f', label: '3-5' },
            { color: '#239a3b', label: '6-8' },
            { color: '#196127', label: '9+' }
        ];

        colorLevels.forEach(level => {
            const item = document.createElement('div');
            item.className = 'legend-item';

            const colorBox = document.createElement('div');
            colorBox.className = 'color-box';
            colorBox.style.backgroundColor = level.color;

            const label = document.createElement('span');
            label.textContent = level.label;

            item.appendChild(colorBox);
            item.appendChild(label);
            legend.appendChild(item);
        });

        container.appendChild(legend);
    }

    // Function to initialize empty charts
    function initializeEmptyCharts() {
        initializeEmptyRatingChart();

        // Add initialization for other charts here

        // Initialize empty heatmap
        const heatmapContainer = document.getElementById('activityHeatmap');
        if (heatmapContainer) {
            heatmapContainer.innerHTML = '<div class="no-data">No submission activity available</div>';
        }
    }

    // Start by fetching the user profile
    fetchUserProfile();
});