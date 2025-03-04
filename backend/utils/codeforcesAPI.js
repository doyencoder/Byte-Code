// Add these functions to your existing utils/codeforcesApi.js file

// Utility function to fetch data from Codeforces API
async function fetchFromCodeforces(method, params = {}) {
    const baseUrl = 'https://codeforces.com/api/';
    const queryParams = new URLSearchParams(params).toString();
    const url = `${baseUrl}${method}?${queryParams}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK') {
            return data.result;
        } else {
            throw new Error(data.comment || 'API request failed');
        }
    } catch (error) {
        console.error(`Error fetching from Codeforces API (${method}):`, error);
        throw error;
    }
}

// Fetch problems from Codeforces
async function fetchProblemsFromCodeforces() {
    try {
        const problemsetData = await fetchFromCodeforces('problemset.problems');
        
        // Filter to get only the problems we want (ratings 800-2000)
        let filteredProblems = problemsetData.problems.filter(problem => 
            problem.rating && problem.rating >= 800 && problem.rating <= 2000
        );
        
        // Organize problems by rating
        const problemsByRating = {};
        for (let rating = 800; rating <= 2000; rating += 100) {
            // Get problems with this rating
            const problemsWithRating = filteredProblems.filter(p => p.rating === rating);
            
            // Take top 10 problems for each rating (or all if less than 10)
            problemsByRating[rating] = problemsWithRating.slice(0, 10);
        }
        
        // Flatten the problems array for storage
        const selectedProblems = Object.values(problemsByRating).flat();
        
        // Format problems for our application
        return selectedProblems.map(problem => ({
            id: `${problem.contestId}-${problem.index}`,
            title: problem.name,
            rating: problem.rating,
            tags: problem.tags,
            status: "unsolved", // Default status
            link: `https://codeforces.com/problemset/problem/${problem.contestId}/${problem.index}`
        }));
    } catch (error) {
        console.error("Error fetching problems from Codeforces:", error);
        throw error;
    }
}

// Get user's solved problems from Codeforces
async function getUserSolvedProblems(codeforcesUsername) {
    try {
        if (!codeforcesUsername) {
            throw new Error("Codeforces username is required");
        }
        
        const submissions = await fetchFromCodeforces('user.status', {
            handle: codeforcesUsername,
            from: 1,
            count: 1000 // Get the latest 1000 submissions
        });
        
        // Extract successfully solved problems
        const solvedProblems = new Set();
        
        submissions.forEach(submission => {
            if (submission.verdict === 'OK') {
                const problemId = `${submission.problem.contestId}-${submission.problem.index}`;
                solvedProblems.add(problemId);
            }
        });
        
        return solvedProblems;
    } catch (error) {
        console.error("Error fetching user's solved problems:", error);
        throw error;
    }
}

module.exports = {
    fetchFromCodeforces,
    fetchProblemsFromCodeforces,
    getUserSolvedProblems
};