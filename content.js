let highlightedDivs = [];  // List to remember highlighted divs
let deletedDivsStack = [];  // Stack to store the deleted divs
let isScanningEnabled = true;  // Flag to control scanning
let maxDeletedItems = 5;  // Maximum number of deleted items to keep for undo

function handleMouseEvents(event) {
  event.stopPropagation();
  event.preventDefault();
  const element = event.target;

  if (!isScanningEnabled) return;

  if (event.type === 'mouseover') {
    clearHighlightedDivs();
    recursiveHighlight(element);
  } else if (event.type === 'click') {
    isScanningEnabled = false;
    document.removeEventListener('mouseover', handleMouseEvents);
    document.removeEventListener('click', handleMouseEvents);

    if (highlightedDivs.length > 0) {
      openLinksInNewTab();
      addDeleteButtons(highlightedDivs);
      addToDeletedStack(highlightedDivs);
      clearHighlightedDivs();
    }
  }
}

function openLinksInNewTab() {
  document.querySelectorAll('a').forEach(link => link.setAttribute('target', '_blank'));
}

function recursiveHighlight(element) {
  if (element && !isTopLevelElement(element)) {
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
      const originalParent = div.parentElement;
      addToDeletedStack({ div, originalParent });  // Add to the deleted stack with original parent info
      div.remove();
    });
    div.appendChild(deleteButton);
  }
}

function addToDeletedStack({ div, originalParent }) {
  if (deletedDivsStack.length >= maxDeletedItems) {
    deletedDivsStack.shift();  // Remove the oldest deleted item if at max capacity
  }
  deletedDivsStack.push({ div, originalParent });
}


function clearHighlightedDivs() {
  for (const div of highlightedDivs) {
    div.style.border = '';
  }
  highlightedDivs = [];
}

alert('content.js activated')

document.addEventListener('mouseover', handleMouseEvents);
document.addEventListener('click', handleMouseEvents);

document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault();
    undoDeletion();
  }
});

function undoDeletion() {
  if (deletedDivsStack.length > 0) {
    const lastDeletedItem = deletedDivsStack.pop();
    const div = lastDeletedItem.div;
    const originalParent = lastDeletedItem.originalParent;

    if (originalParent) {
      originalParent.appendChild(div);  // Restore the deleted div to its original parent
    } else {
      document.body.appendChild(div);  // Restore the deleted div at the end of the document if original parent not found
    }
  }
}


