// Existing global variables
let allProblems = [];
let currentProblems = [];
let currentPage = 1;
const problemsPerPage = 15;
let userSolvedProblems = new Set();
let weakTopicsProblemsFull = [];

// NEW GLOBALS for Weak Topics
let weakTopicsProblems = [];
let weakTopicsCurrentPage = 1;
function applyFilters() {
    const allProblemsSection = document.getElementById("allProblemsSection");
    if (allProblemsSection.style.display !== "none") {
      filterProblems();
    } else {
      filterWeakTopicsProblems();
    }
  }
  
// Modified toggleView to trigger weak topics fetching when needed
function toggleView(section) {
    const allProblemsSection = document.getElementById("allProblemsSection");
    const weakTopicsSection = document.getElementById("weakTopicsSection");
    const allBtn = document.getElementById("allProblemsBtn");
    const weakBtn = document.getElementById("weakTopicsBtn");

    if (section === "all") {
        allProblemsSection.style.display = "block";
        weakTopicsSection.style.display = "none";
        allBtn.classList.add("active");
        weakBtn.classList.remove("active");
        weakBtn.style.backgroundColor = "beige";
        allBtn.style.backgroundColor = "hsl(224, 100%, 94%)";
    } else {
        allProblemsSection.style.display = "none";
        weakTopicsSection.style.display = "block";
        allBtn.classList.remove("active");
        weakBtn.classList.add("active");
        weakBtn.style.backgroundColor = "hsl(224, 100%, 94%)";
        allBtn.style.backgroundColor = "beige";
        // When switching to weak topics view, fetch the weak topics problems
        if (allProblems.length > 0) {
            fetchWeakTopicsProblems();
        }
    }
}

// ------------------------------
// Helper: Retrieve Codeforces Handle from MongoDB using /fetch-user
// ------------------------------
async function getCfHandle() {
    const token = localStorage.getItem("token");
    if (!token) {
        alert("Token not found. Please log in again.");
        return null;
    }
    try {
        // Call the fetch-user endpoint (adjust the URL if needed based on your routing)
        const response = await fetch(`/api/codeforces/fetch-user`, {
            method: "GET",
            headers: {
                "Authorization":  token,
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        // Check if the handle is linked
        if (data.handle && data.handle !== "Not linked") {
            return data.handle;
        } else {
            alert("Codeforces handle not linked. Please link your handle.");
            return null;
        }
    } catch (error) {
        console.error("Error retrieving Codeforces handle:", error);
        alert("Failed to get Codeforces handle. Please try again later.");
        return null;
    }
}


// ------------------------------
// Weak Topics Problems Functions (Updated)
// ------------------------------

async function fetchWeakTopicsProblems() {
    try {
        document.getElementById("weak-topics-loading").style.display = "block";

        // Retrieve Codeforces handle from MongoDB using token & email
        const cfHandle = await getCfHandle();
        if (!cfHandle) {
            throw new Error("Codeforces handle not found.");
        }
        console.log("Retrieved CF Handle:", cfHandle);
        // Retrieve token from localStorage
        const token = localStorage.getItem("token");
        // Fetch weak topics from your backend endpoint using the retrieved handle with auth header
        const weakTopicsResponse = await fetch(`/api/codeforces/weak-topics/${cfHandle}`, {
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            }
        });
        if (!weakTopicsResponse.ok) {
            throw new Error("Failed to fetch weak topics");
        }
        const weakTopicsData = await weakTopicsResponse.json();
        if (!weakTopicsData.weakTopics) {
            throw new Error("Weak topics data not available");
        }
        const weakTopics = weakTopicsData.weakTopics; // Array of topic objects (each with a "tag" property)

        // For each weak topic tag, filter unsolved problems from the allProblems array
        let combinedProblems = [];
        weakTopics.forEach(topic => {
            const tag = topic.tag;
            let unsolvedForTag = allProblems.filter(problem => {
                return problem.tags.includes(tag) && !userSolvedProblems.has(problem.id);
            });
            // Sort problems by contestId descending (as a proxy for recency)
            unsolvedForTag.sort((a, b) => b.contestId - a.contestId);
            // Take the 15 most recent problems for this tag
            unsolvedForTag = unsolvedForTag.slice(0, problemsPerPage);
            combinedProblems = combinedProblems.concat(unsolvedForTag);
        });

        // Remove duplicate problems (if any problem appears under multiple weak topics)
        const uniqueProblemsMap = new Map();
        combinedProblems.forEach(problem => {
            if (!uniqueProblemsMap.has(problem.id)) {
                uniqueProblemsMap.set(problem.id, problem);
            }
        });
        weakTopicsProblems = Array.from(uniqueProblemsMap.values());
        weakTopicsProblemsFull = [...weakTopicsProblems];
        // Optionally, sort the combined list overall by contestId descending
        weakTopicsProblems.sort((a, b) => b.contestId - a.contestId);
        weakTopicsCurrentPage = 1;
        displayWeakTopicsProblems();
    } catch (error) {
        console.error("Error fetching weak topics problems:", error);
        alert("Failed to load weak topics problems. Please try again later.");
    } finally {
        document.getElementById("weak-topics-loading").style.display = "none";
    }
}

function displayWeakTopicsProblems() {
    const startIdx = (weakTopicsCurrentPage - 1) * problemsPerPage;
    const endIdx = startIdx + problemsPerPage;
    const pageProblems = weakTopicsProblems.slice(startIdx, endIdx);

    const tableBody = document.getElementById("weakTopicsProblemsTable");
    tableBody.innerHTML = "";

    if (pageProblems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="no-results">No weak topics problems found</td></tr>`;
        return;
    }

    pageProblems.forEach(problem => {
        // Although these are unsolved by construction, we still check status for consistency
        const status = userSolvedProblems.has(problem.id) ? "solved" : "unsolved";
        const row = `<tr data-id="${problem.id}">
                        <td><a href="${problem.link}" target="_blank">${problem.title}</a></td>
                        <td>${problem.rating}</td>
                        <td>${problem.tags.join(", ")}</td>
                        <td class="${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
                     </tr>`;
        tableBody.innerHTML += row;
    });

    document.getElementById("weak-topics-page-info").textContent =
        `Page ${weakTopicsCurrentPage} of ${Math.max(1, Math.ceil(weakTopicsProblems.length / problemsPerPage))}`;
}

function nextWeakTopicsPage() {
    const maxPage = Math.max(1, Math.ceil(weakTopicsProblems.length / problemsPerPage));
    if (weakTopicsCurrentPage < maxPage) {
        weakTopicsCurrentPage++;
        displayWeakTopicsProblems();
        window.scrollTo(0, 0);
    }
}

function prevWeakTopicsPage() {
    if (weakTopicsCurrentPage > 1) {
        weakTopicsCurrentPage--;
        displayWeakTopicsProblems();
        window.scrollTo(0, 0);
    }
}

// Refresh function for weak topics problems
async function refreshWeakTopicsProblems() {
    try {
        document.getElementById("weak-topics-loading").style.display = "block";
        // Refresh user's solved problems
        const userEmail = localStorage.getItem("email");
        if (!userEmail) {
            alert("User email not found. Please log in again.");
            return;
        }
        const response = await fetch(`/api/codeforces/user/solved-problems?email=${encodeURIComponent(userEmail)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });
        const data = await response.json();
        if (data.success) {
            userSolvedProblems = new Set(data.solvedProblems);
        } else {
            throw new Error(data.error || "Failed to refresh problem statuses");
        }
        // Re-fetch the weak topics problems after updating solved statuses
        await fetchWeakTopicsProblems();
        alert("Weak topics problem statuses refreshed successfully!");
    } catch (error) {
        console.error("Error refreshing weak topics problem statuses:", error);
        alert("Failed to refresh weak topics problem statuses. Please try again later.");
    } finally {
        document.getElementById("weak-topics-loading").style.display = "none";
    }
}
function filterWeakTopicsProblems() {
    const selectedRating = document.getElementById("ratingFilter").value;
    const selectedTag = document.getElementById("tagFilter").value;
    const selectedStatus = document.getElementById("statusFilter").value;
    
    // Filter the full list of weak topics problems
    weakTopicsProblems = weakTopicsProblemsFull.filter(problem => {
        const problemStatus = userSolvedProblems.has(problem.id) ? "solved" : "unsolved";
        const ratingMatch = selectedRating === "all" || problem.rating == selectedRating;
        const tagMatch = selectedTag === "all" || problem.tags.includes(selectedTag);
        const statusMatch = selectedStatus === "all" || problemStatus === selectedStatus;
        return ratingMatch && tagMatch && statusMatch;
    });
    
    weakTopicsCurrentPage = 1;
    displayWeakTopicsProblems();
}


// ------------------------------
// Existing Functions for All Problems (unchanged)
// ------------------------------

async function fetchProblems() {
    document.getElementById("loading").style.display = "block";
    
    try {
        // Fetch problems from our backend API
        const response = await fetch('/api/codeforces/problems');
        const data = await response.json();
        
        if (data.success) {
            allProblems = data.problems;
            
            // Load user's solved problems
            await refreshStatus();
            
            // Update UI
            filterProblems();
        } else {
            throw new Error(data.error || 'Failed to fetch problems');
        }
    } catch (error) {
        console.error("Error fetching problems:", error);
        alert("Failed to load problems. Please try again later.");
    } finally {
        document.getElementById("loading").style.display = "none";
    }
}

function displayProblems() {
    const startIdx = (currentPage - 1) * problemsPerPage;
    const endIdx = startIdx + problemsPerPage;
    const pageProblems = currentProblems.slice(startIdx, endIdx);
    
    const tableBody = document.getElementById("problemTable");
    tableBody.innerHTML = "";
    
    if (pageProblems.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="no-results">No problems match your filters</td></tr>`;
        return;
    }
    
    pageProblems.forEach(problem => {
        // Check if problem is solved by the user
        const status = userSolvedProblems.has(problem.id) ? "solved" : "unsolved";
        
        const row = `<tr data-id="${problem.id}">
            <td><a href="${problem.link}" target="_blank">${problem.title}</a></td>
            <td>${problem.rating}</td>
            <td>${problem.tags.join(", ")}</td>
            <td class="${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</td>
        </tr>`;
        tableBody.innerHTML += row;
    });
    
    document.getElementById("page-info").textContent = `Page ${currentPage} of ${Math.max(1, Math.ceil(currentProblems.length / problemsPerPage))}`;
}

function nextPage() {
    const maxPage = Math.max(1, Math.ceil(currentProblems.length / problemsPerPage));
    if (currentPage < maxPage) {
        currentPage++;
        displayProblems();
        window.scrollTo(0, 0);
    }
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayProblems();
        window.scrollTo(0, 0);
    }
}

function filterProblems() {
    const selectedRating = document.getElementById("ratingFilter").value;
    const selectedTag = document.getElementById("tagFilter").value;
    const selectedStatus = document.getElementById("statusFilter").value;
    
    currentProblems = allProblems.filter(problem => {
        const problemStatus = userSolvedProblems.has(problem.id) ? "solved" : "unsolved";
        const ratingMatch = selectedRating === "all" || problem.rating == selectedRating;
        const tagMatch = selectedTag === "all" || problem.tags.includes(selectedTag);
        const statusMatch = selectedStatus === "all" || problemStatus === selectedStatus;
        return ratingMatch && tagMatch && statusMatch;
    });
    
    currentPage = 1;
    displayProblems();
}

function resetFilters() {
    document.getElementById("ratingFilter").value = "all";
    document.getElementById("tagFilter").value = "all";
    document.getElementById("statusFilter").value = "all";
    applyFilters();
}

async function refreshStatus() {
    try {
        document.getElementById("loading").style.display = "block";

        const userEmail = localStorage.getItem("email");
        if (!userEmail) {
            alert("User email not found. Please log in again.");
            return;
        }

        const response = await fetch(`/api/codeforces/user/solved-problems?email=${encodeURIComponent(userEmail)}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (data.success) {
            userSolvedProblems = new Set(data.solvedProblems);
            filterProblems();
            alert("Problem statuses refreshed successfully!");
        } else {
            throw new Error(data.error || "Failed to refresh problem statuses");
        }
    } catch (error) {
        console.error("Error refreshing problem statuses:", error);
        alert("Failed to refresh problem statuses. Please try again later.");
    } finally {
        document.getElementById("loading").style.display = "none";
    }
}

// Initialize with all problems
document.addEventListener("DOMContentLoaded", () => {
    fetchProblems();
});
