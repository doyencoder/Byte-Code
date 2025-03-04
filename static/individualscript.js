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
    
    localStorage.setItem("contestDuration", duration); // Store duration in localStorage

    for (let i = 1; i <= num; i++) {
        let div = document.createElement("div");
        div.className = "question-container";

        let label = document.createElement("label");
        label.textContent = `Question ${i} Difficulty (Rating):`;

        let select = document.createElement("select");
        select.id = `question${i}`;

        // Generate difficulty options (800 to 2000 in steps of 100)
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
    // Store questions and difficulty levels in localStorage
    let questionData = [];
    for (let i = 1; i <= num; i++) {
        let difficulty = document.getElementById(`question${i}`).value;
        questionData.push({ question: i, difficulty: difficulty });
    }
    localStorage.setItem("contestData", JSON.stringify(questionData));
    localStorage.setItem("contestDuration", duration);
    localStorage.setItem("contestEndTime", Date.now() + parseInt(duration) * 1000 + 15 *1000); 
    
    let startButton = document.getElementById("startButton");
    startButton.disabled = true;

    // Prevent refresh warning
    window.onbeforeunload = function () {
        return "Contest is starting, please do not refresh!";
    };

    document.getElementById("note").style.display = "block";

    let timeLeft = 15;
    let countdown = document.getElementById("countdown");

    let timer = setInterval(() => {
        timeLeft--;
        countdown.textContent = timeLeft;
        if (timeLeft === 0) {
            clearInterval(timer);
            window.onbeforeunload = null;
            window.location.href = "contestpage.html";
        }
    }, 1000);
}
