function showDurationSelection() {
    let num = document.getElementById("numQuestions").value;
    if (!num) {
        alert("Please select the number of questions.");
        return;
    }
    document.getElementById("durationSelection").style.display = "block";
}

function generateLevelSelection() {
    let levelDiv = document.getElementById("levelSelection");
    levelDiv.innerHTML = "";
    let num = document.getElementById("numQuestions").value;
    let duration = document.getElementById("contestDuration").value;
    
    if (!num || !duration) {
        alert("Please complete the previous steps.");
        return;
    }
    
    localStorage.setItem("contestDuration", duration); // Store duration

    for (let i = 1; i <= num; i++) {
        let div = document.createElement("div");
        div.className = "question-container";

        let label = document.createElement("label");
        label.textContent = `Question ${i} Difficulty (Rating):`;

        let select = document.createElement("select");
        select.id = `question${i}`;

        // Options from 800 to 2000 in steps of 100
        for (let rating = 800; rating <= 2000; rating += 100) {
            let option = document.createElement("option");
            option.value = rating;
            option.textContent = rating;
            select.appendChild(option);
        }

        div.appendChild(label);
        div.appendChild(select);
        levelDiv.appendChild(div);
    }

    document.getElementById("startButton").style.display = "block";
}

function startCountdown() {
    let num = document.getElementById("numQuestions").value;
    let duration = localStorage.getItem("contestDuration") || document.getElementById("contestDuration").value;
    let questionData = [];
    for (let i = 1; i <= num; i++) {
        let difficulty = document.getElementById(`question${i}`).value;
        questionData.push({ question: i, difficulty: difficulty });
    }
    localStorage.setItem("contestData", JSON.stringify(questionData));
    localStorage.setItem("contestDuration", duration);

    // Set pre-contest timer for 15 seconds
    const preContestDuration = 15;
    localStorage.setItem("preContestEndTime", Date.now() + preContestDuration * 1000);

    // Fetch contest problems during the pre-contest period
    fetchContestProblems();

    // Warn user not to refresh
    window.onbeforeunload = function () {
        return "Contest is preparing, please do not refresh!";
    };

    document.getElementById("note").style.display = "block";

    let timeLeft = preContestDuration;
    let countdown = document.getElementById("countdown");

    let timer = setInterval(() => {
        timeLeft--;
        countdown.textContent = timeLeft;
        if (timeLeft === 0) {
            clearInterval(timer);
            window.onbeforeunload = null;
            // Set contest end time based on user-selected duration (in seconds)
            const contestDurationSeconds = parseInt(duration);
            localStorage.setItem("contestEndTime", Date.now() + contestDurationSeconds * 1000);
            // Create the contest attempt record in the DB
            createContestAttempt(contestDurationSeconds);
        }
    }, 1000);
}

async function fetchContestProblems() {
    try {
        const token = localStorage.getItem('token');
        const contestData = JSON.parse(localStorage.getItem('contestData'));
        const ratings = contestData.map(q => q.difficulty);
        // Fetch problems from backend with ratings as comma-separated string
        const response = await fetch(`/api/contest/fetch-problems?numQuestions=${contestData.length}&ratings=${ratings.join(',')}`, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });
        const problems = await response.json();
        // Save fetched problems for use on contest page
        localStorage.setItem('fetchedProblems', JSON.stringify(problems));
    } catch (error) {
        console.error('Error fetching contest problems:', error);
        alert('Failed to fetch contest problems. Please try again.');
    }
}

async function createContestAttempt(contestDurationSeconds) {
    try {
        const token = localStorage.getItem('token');
        const contestData = JSON.parse(localStorage.getItem("contestData"));
        const fetchedProblems = JSON.parse(localStorage.getItem("fetchedProblems"));
        // Prepare problems data for the schema
        const problemStatuses = fetchedProblems.map(problem => ({
            problemId: `${problem.contestId}${problem.index}`,
            contestId: problem.contestId,
            index: problem.index,
            rating: problem.rating,
            link: problem.link,
            wrongSubmissionCount: 0,
            solvedAt: null,
            status: 'unsolved'
        }));

        const attemptData = {
            problems: problemStatuses,
            startTime: new Date(), // contest starts now
            endTime: new Date(Date.now() + contestDurationSeconds * 1000),
            duration: contestDurationSeconds,
            status: 'ongoing',
            totalProblems: contestData.length,
            solvedProblemsCount: 0
        };

        const response = await fetch("/api/contest/save-attempt", {
            method: "POST",
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(attemptData)
        });
        const data = await response.json();
        if (data.contestAttempt && data.contestAttempt._id) {
            // Save the contest attempt ID for later updates
            localStorage.setItem("contestAttemptId", data.contestAttempt._id);
        }
        // Redirect to contest page after saving attempt
        window.location.href = "contestpage.html";
    } catch (error) {
        console.error("Error creating contest attempt:", error);
        alert("Failed to create contest attempt. Please try again.");
    }
}
