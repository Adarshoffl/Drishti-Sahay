

document.querySelector(".red").addEventListener("click", function () {
    document.body.style.backgroundColor = "red";
});
document.querySelector(".green").addEventListener("click", function () {
    document.body.style.backgroundColor = "green";
});
document.querySelector(".blue").addEventListener("click", function () {
    document.body.style.backgroundColor = "blue";
});
document.querySelector(".yellow").addEventListener("click", function () {
    document.body.style.backgroundColor = "yellow";
});
document.querySelector(".purple").addEventListener("click", function () {
    document.body.style.backgroundColor = "purple";
});
document.querySelector(".orange").addEventListener("click", function () {
    document.body.style.backgroundColor = "orange";
});
document.querySelector(".pink").addEventListener("click", function () {
    document.body.style.backgroundColor = "pink";
});
document.querySelector(".grey").addEventListener("click", function () {
    document.body.style.backgroundColor = "grey";
});
document.querySelector(".black").addEventListener("click", function () {
    document.body.style.backgroundColor = "black";
});
document.querySelector(".white").addEventListener("click", function () {
    document.body.style.backgroundColor = "white";
});

document.addEventListener("keydown", function (a) {
    if (!a.altKey) return; // Only run when alt key is pressed

    switch (a.key) {
        case "1":
           
            document.body.style.background = "red";
            break;
        case "2":
            document.body.style.background = "green";
            break;
        case "3":
            document.body.style.background = "blue";
            break;
        case "4":
            document.body.style.background = "#f5f227ff";
            break;
        case "5":
            document.body.style.background = "purple";
            break;
        case "6":
            document.body.style.background = "orange";
            break;
        case "7":
            document.body.style.background = "pink";
            break;
        case "8":
            document.body.style.background = "gray";
            break;
        case "9":
            document.body.style.background = "black";
            break;

        case "0":
            document.body.style.background = ""; // Reset
            break;
    }
});

// Load saved shortcuts OR default
let shortcuts = JSON.parse(localStorage.getItem("shortcuts")) || {
    red: "a",
    green: "s",
    blue: "d",
    yellow: "f",
    purple: "g",
    orange: "h",
    pink: "j",
    grey: "k",
    black: "l",
    white: ";"
};

// Fill input fields when website loads
document.querySelectorAll(".key-input").forEach(input => {
    const color = input.dataset.color;
    input.value = shortcuts[color];
});

// Save function
function saveShortcuts() {
    document.querySelectorAll(".key-input").forEach(input => {
        const color = input.dataset.color;
        shortcuts[color] = input.value.toLowerCase();
    });

    localStorage.setItem("shortcuts", JSON.stringify(shortcuts));
    alert("Shortcuts updated!");
}


// Apply shortcuts
document.addEventListener("keydown", function (e) {
    if (!e.altKey) return;

    const pressed = e.key.toLowerCase();

    for (let color in shortcuts) {
        if (shortcuts[color] === pressed) {
            document.body.style.backgroundColor = color;
        }
    }
});

// OPEN POPUP
document.getElementById("openPopup").onclick = function () {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("popupBox").style.display = "block";
};

// CLOSE POPUP
document.getElementById("closePopup").onclick = function () {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("popupBox").style.display = "none";
};

// CLICKING OUTSIDE CLOSES POPUP
document.getElementById("overlay").onclick = function () {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("popupBox").style.display = "none";
};