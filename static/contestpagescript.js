document.addEventListener("DOMContentLoaded", function () {
    // localStorage se contest ka data fetch karo
    let contestData = JSON.parse(localStorage.getItem("contestData")) || [];
    let contestDuration = parseInt(localStorage.getItem("contestDuration")) || 7200;
    let contestEndTime = parseInt(localStorage.getItem("contestEndTime")) || Date.now() + contestDuration * 1000;
    let problemsList = document.getElementById("problems-list");

    function loadProblems() {
        problemsList.innerHTML = "";
        contestData.forEach((q, index) => {
            let row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><a href="#">Problem ${index + 1}</a></td>
                <td style="background-color: ${getColor(q.difficulty)}">${q.difficulty}</td>
                <td style="background-color: lightpink">Pending</td>
            `;
            problemsList.appendChild(row);
        });
    }

    function getColor(rating) {
        if (rating < 1200) return "rgb(204, 204, 204)";
        if (rating < 1400) return "rgb(119, 255, 119)";
        if (rating < 1600) return "rgb(119, 221, 187)";
        if (rating < 1900) return "rgb(170, 170, 255)"
        return "violet";
    }
    // Timer Logic (2 Hours Countdown)
    function updateTimer() {
        let timerElement = document.getElementById("timer");
        function tick() {
            let remainingTime = Math.max(0, Math.floor((contestEndTime - Date.now() + 15) / 1000));
            let hours = Math.floor(remainingTime / 3600);
            let minutes = Math.floor((remainingTime % 3600) / 60);
            let seconds = remainingTime % 60;
            timerElement.textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
            
            if (remainingTime > 0) {
                setTimeout(tick, 1000);
            }
        }
        tick();
    }
    loadProblems();
    updateTimer();

    // Refresh Button
    document.getElementById("refresh-btn").addEventListener("click", loadProblems);
});