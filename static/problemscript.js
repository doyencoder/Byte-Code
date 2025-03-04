// Create this file at static/problemscript.js

// Global variables
let allProblems = [];
let currentProblems = [];
let currentPage = 1;
const problemsPerPage = 15;
let userSolvedProblems = new Set();

// Function to fetch problems from backend
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

// Function to display problems on the current page
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

// Navigation functions
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

// Function to filter problems based on rating, tags & status
function filterProblems() {
    const selectedRating = document.getElementById("ratingFilter").value;
    const selectedTag = document.getElementById("tagFilter").value;
    const selectedStatus = document.getElementById("statusFilter").value;
    
    currentProblems = allProblems.filter(problem => {
        // Determine problem status
        const problemStatus = userSolvedProblems.has(problem.id) ? "solved" : "unsolved";
        
        const ratingMatch = selectedRating === "all" || problem.rating == selectedRating;
        const tagMatch = selectedTag === "all" || problem.tags.includes(selectedTag);
        const statusMatch = selectedStatus === "all" || problemStatus === selectedStatus;
        
        return ratingMatch && tagMatch && statusMatch;
    });
    
    // Reset to first page when filtering
    currentPage = 1;
    displayProblems();
}

// Function to reset all filters
function resetFilters() {
    document.getElementById("ratingFilter").value = "all";
    document.getElementById("tagFilter").value = "all";
    document.getElementById("statusFilter").value = "all";
    filterProblems();
}

// Function to refresh problem status
async function refreshStatus() {
    try {
        document.getElementById("loading").style.display = "block";

        const userEmail = localStorage.getItem("email"); // Get stored email
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