let isScanningEnabled = false;  // Flag to control scanning
let highlightedDivs = [];  // List to remember highlighted divs
let deletedDivsStack = [];  // Stack to store the deleted divs
let maxDeletedItems = 5;  // Maximum number of deleted items to keep for undo

let finalDivs = [];

// Note: double click shift to activate all this

function handleMouseEvents(event) {
  event.preventDefault();
  event.stopPropagation();
  const element = event.target;

  if (!isScanningEnabled) return;

  if (event.type === 'mouseover') {
    clearHighlightedDivs();
    recursiveHighlight(element);
  } else if (event.type === 'click') {

    if (highlightedDivs.length > 0) {
      document.addEventListener('keydown', event => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
          event.preventDefault();
          undoDeletion();
        }
      });

      openLinksInNewTab();
      addDeleteButtons(highlightedDivs);
	  finalDivs = [...highlightedDivs];
      addDraggableBehavior(highlightedDivs);
    }
    stopScanning();
  }
}

const stopScanning = () => {
    isScanningEnabled = false;
    document.removeEventListener('mouseover', handleMouseEvents);
    document.removeEventListener('click', handleMouseEvents);
    clearHighlightedDivs();
}

let isDragging = false;
let draggedElement = null;

function addDraggableBehavior(divs) {
  //const deleteButtons = document.querySelectorAll('button');

  divs.forEach(button => {
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', '');  // Set data for dragging
      isDragging = true;
      draggedElement = button;//.parentElement;
    });

    button.addEventListener('dragend', () => {
      isDragging = false;
      draggedElement = null;
    });
  });

  document.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!isDragging)
        return;
    let targetElement = event.target;

    // hope this doesn't slow it down too much. the faster way might be to keep a list of bounding boxes of the elements
    // and update it on every swap
    while (!finalDivs.includes(targetElement)) {
      targetElement = targetElement.parentElement;
      if (targetElement === document.documentElement || targetElement === document.body)
          return;
    }

    if (/*isDragging && */targetElement !== draggedElement){// && finalDivs.includes(targetElement)) {
      //console.log(targetElement.innerText);
      const boundingBox = targetElement.getBoundingClientRect();

      const x = event.clientX - boundingBox.left;
      const y = event.clientY - boundingBox.top;

      const parent = targetElement.parentElement;
      const draggedIndex = Array.from(parent.children).indexOf(draggedElement);
      const targetIndex = Array.from(parent.children).indexOf(targetElement);

      if (draggedIndex !== -1 && targetIndex !== -1) {
        if (draggedIndex < targetIndex) {
          parent.insertBefore(targetElement, draggedElement);
        } else {
          parent.insertBefore(draggedElement, targetElement);
        }
      }

    }
  });

  document.addEventListener('mousemove', (event) => {
    if (isDragging) {
      const style = draggedElement.style;
      style.position = 'fixed';
      style.top = event.clientY - draggedElement.clientHeight / 2 + 'px';
      style.left = event.clientX - draggedElement.clientWidth / 2 + 'px';
    }
  });
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
  // Hope this doesn't actually modify anything
  const children = [...element.children].filter(x => x.nodeName !== 'SCRIPT' && x.nodeName !== 'SOURCE');

  if (children.length < 3) return false;

  const firstChildClass = children[0].classList[0];
  let count = 0;

  for (let i = 1; i < children.length; i++) {
    if (children[i].classList[0] === firstChildClass) {
      count++;
    }
  }

  let x = (count / children.length) > 0.33;
  if (x) {
      console.log('highlighting children of: ')
      console.log(element)
  }
  return x
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
    deleteButton.addEventListener('click', e => {
      e.preventDefault();
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


let lastShiftClickTime = 0;
const shiftClickThreshold = 300; // Time threshold (in milliseconds) for a rapid double click

document.addEventListener('keydown', event => {
  if (event.key === 'Shift') {
    const currentTime = new Date().getTime();

    if (currentTime - lastShiftClickTime < shiftClickThreshold) {
      // Double shift click detected, activate other listeners
      isScanningEnabled = true;
      document.addEventListener('mouseover', handleMouseEvents);
      document.addEventListener('click', handleMouseEvents, true);
    }
    lastShiftClickTime = currentTime;
  } else if (event.key === 'Escape') {
    stopScanning();
  }
});
