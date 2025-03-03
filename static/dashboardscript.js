document.addEventListener('DOMContentLoaded', function() {
    // Rating History Chart
    const ratingCtx = document.getElementById('ratingChart').getContext('2d');
    const ratingChart = new Chart(ratingCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'Rating',
                data: [1400, 1450, 1490, 1520, 1580, 1620, 1660, 1600, 1650, 1700, 1750, 1724],
                backgroundColor: 'rgba(54, 81, 148, 0.1)',
                borderColor: 'rgba(54, 81, 148, 1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true
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
                            return `Rating: ${context.raw}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 1300,
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

    // Problem Difficulty Distribution Chart
    const difficultyCtx = document.getElementById('difficultyChart').getContext('2d');
    const difficultyChart = new Chart(difficultyCtx, {
        type: 'bar',
        data: {
            labels: ['800', '900', '1000', '1100', '1200', '1300', '1400', '1500', '1600', '1700', '1800', '1900', '2000+'],
            datasets: [{
                label: 'Problems Solved',
                data: [28, 32, 36, 42, 38, 25, 18, 15, 9, 5, 3, 1, 0],
                backgroundColor: [
                    'rgba(118, 188, 255, 0.8)',
                    'rgba(86, 169, 251, 0.8)',
                    'rgba(54, 150, 247, 0.8)',
                    'rgba(42, 131, 230, 0.8)',
                    'rgba(30, 112, 212, 0.8)',
                    'rgba(18, 94, 195, 0.8)',
                    'rgba(6, 76, 177, 0.8)',
                    'rgba(5, 65, 153, 0.8)',
                    'rgba(4, 54, 129, 0.8)',
                    'rgba(3, 44, 105, 0.8)',
                    'rgba(2, 33, 81, 0.8)',
                    'rgba(1, 22, 57, 0.8)',
                    'rgba(0, 11, 33, 0.8)',
                ]
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
                    },
                    title: {
                        display: true,
                        text: 'Number of Problems'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Problem Rating'
                    }
                }
            }
        }
    });

    // Tags Distribution Chart
    const tagsCtx = document.getElementById('tagsChart').getContext('2d');
    const tagsChart = new Chart(tagsCtx, {
        type: 'pie',
        data: {
            labels: ['Math', 'Greedy', 'DP', 'Data Structures', 'Graphs', 'Implementation', 'Strings', 'Other'],
            datasets: [{
                data: [78, 67, 58, 54, 42, 38, 32, 24],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(199, 199, 199, 0.7)',
                    'rgba(83, 102, 255, 0.7)'
                ],
                borderWidth: 1,
                borderColor: '#fff'
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
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Verdict Distribution Chart
    const verdictCtx = document.getElementById('verdictChart').getContext('2d');
    const verdictChart = new Chart(verdictCtx, {
        type: 'doughnut',
        data: {
            labels: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Other'],
            datasets: [{
                data: [245, 120, 42, 34, 15],
                backgroundColor: [
                    'rgba(40, 167, 69, 0.7)',
                    'rgba(220, 53, 69, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(108, 117, 125, 0.7)',
                    'rgba(23, 162, 184, 0.7)'
                ],
                borderWidth: 1,
                borderColor: '#fff'
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
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Generate Activity Heatmap
    const heatmapContainer = document.getElementById('activityHeatmap');
    
    // Generate 371 cells (53 weeks * 7 days)
    for (let i = 0; i < 371; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        
        // Random activity level (0-4) for demonstration
        const activityLevel = Math.floor(Math.random() * 5);
        
        // Set color based on activity level
        const opacity = activityLevel * 0.2;
        cell.style.backgroundColor = `rgba(54, 81, 148, ${opacity})`;
        
        // Add tooltip data
        cell.setAttribute('data-contributions', activityLevel);
        cell.setAttribute('title', `${activityLevel} contributions`);
        
        heatmapContainer.appendChild(cell);
    }
});