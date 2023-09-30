let highlightedDivs = [];  // List to remember highlighted divs
let isScanningEnabled = true;  // Flag to control scanning

function handleMouseEvents(event) {
  event.stopPropagation();
  event.preventDefault();
  const element = event.target;
  if (!isScanningEnabled) return;

  if (event.type === 'mouseover') {
    clearHighlightedDivs();
    recursiveHighlight(element);
  } else if (event.type === 'click' /* && highlightedDivs.length > 0*/) {
    isScanningEnabled = false;
    document.removeEventListener('mouseover', handleMouseEvents);
	document.removeEventListener('click', handleMouseEvents);

    if (highlightedDivs.length > 0) {
        openLinksInNewTab();
        addDeleteButtons(highlightedDivs);
        clearHighlightedDivs();
    }
    
  }
}

function openLinksInNewTab(){
    // only for highligthed divs?
    document.querySelectorAll('a').forEach(link => link.setAttribute('target', '_blank'));
}

function recursiveHighlight(element) {
  if (element && !isTopLevelElement(element)) {
    //element.style.border = '2px solid red';
    //highlightedDivs.push(element);

    if (checkChildrenClasses(element)) {
      highlightAllChildren(element);
      return;  // Stop traversal for this div
    }

    recursiveHighlight(element.parentElement);  // Recurse with the parent
  }
}

function isTopLevelElement(element) {
  return element === document.documentElement || element === document.body;
}

function checkChildrenClasses(element) {
  const children = element.children;
  if (children.length < 3) return false;

  const firstChildClass = children[0].classList[0];
  let count = 0;

  for (let i = 1; i < children.length; i++) {
    if (children[i].classList[0] === firstChildClass) {
      count++;
    }
  }

  return (count / children.length) > 0.75;
}

function highlightAllChildren(element) {
  const children = element.children;
  for (const child of children) {
    child.style.border = '2px solid red';
    highlightedDivs.push(child);
  }
}

function addDeleteButtons(divs) {
  for (const div of divs) {
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => {
      div.remove();
    });
    div.appendChild(deleteButton);
  }
}

function clearHighlightedDivs() {
  for (const div of highlightedDivs) {
    div.style.border = '';
  }
  highlightedDivs = [];
}

document.addEventListener('mouseover', handleMouseEvents);
document.addEventListener('click', handleMouseEvents);
