console.log("test web view ");
function toggleContent(stepIndex) {
  const step = document.getElementById(`step-${stepIndex}`);
  const content = step.querySelector(".content");

  if (content.style.display === "none") {
    content.style.display = "block";
  } else {
    content.style.display = "none";
  }
}
