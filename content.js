let listParents = [];
let isScanningEnabled = false;  // Flag to control scanning
let highlightedDivs = [];  // List to remember highlighted divs
let maxDeletedItems = 5;  // Maximum number of deleted items to keep for undo

let finalDivs = [];

let actionStack = [];

// Note: double click shift to activate all this

function handleMouseEvents(event) {
  if (!isScanningEnabled) {
      checkDeletionButtons();
      return;
  }
  event.preventDefault();
  event.stopPropagation();
  const element = event.target;


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

      addDeleteButtons(highlightedDivs);
	  finalDivs = [...highlightedDivs];
      addDraggableBehavior(highlightedDivs);
      // Keep on the look out for more 'siblings'
      listParents.push(highlightedDivs[0].parentElement);

    }
    stopScanning();
  }
}

const stopScanning = () => {
    document.removeEventListener('mouseover', handleMouseEvents);
    document.removeEventListener('click', handleMouseEvents);
    clearHighlightedDivs();
    isScanningEnabled = false;
}

let isDragging = false;
let draggedElement = null;
let dragStartIndex = 0;

function addDraggableBehavior(divs) {

  divs.forEach(button => {
    button.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', '');  // Set data for dragging
      isDragging = true;
      draggedElement = button;//.parentElement;
      dragStartIndex = [...button.parentElement.children].indexOf(button);
    });

    button.addEventListener('dragend', ({target}) => {
      isDragging = false;
      draggedElement = null;
      actionStack.push({parent:button.parentElement,startIndex:dragStartIndex,endIndex:[...button.parentElement.children].indexOf(button),type:'drag'});
      dragStartIndex = 0;
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

    if (targetElement !== draggedElement){
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
  // Collect all children except for SCRIPT and SOURCE
  const children = [...element.children].filter(x => x.nodeName !== 'SCRIPT' && x.nodeName !== 'SOURCE');

  // If there are fewer than 3 children, exit early
  if (children.length < 3) return false;

  // Create a map to count occurrences of the first class for each child
  const classCount = new Map();

  // Count the occurrences of each first class
  for (let child of children) {
    const firstClass = child.classList[0];
    if (firstClass) {
      classCount.set(firstClass, (classCount.get(firstClass) || 0) + 1);
    }
  }

  // Find the class with the maximum occurrence
  let maxClassCount = 0;
  let mostCommonClass = null;

  for (let [cls, count] of classCount) {
    if (count > maxClassCount) {
      maxClassCount = count;
      mostCommonClass = cls;
    }
  }

  // Check if the majority of children share this most common class
  const majority = (maxClassCount / children.length) > 0.7; // Majority = more than 50%

  return majority;
}


function highlightAllChildren(element) {
  const children = element.children;
  for (const child of children) {
    child.style.border = '2px solid red';
    highlightedDivs.push(child);
  }
}

function addDeleteButtons(divs) {
  for (const div of divs){
      addDeleteButton(div);
  }
}

const addDeleteButton = (div) => {
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';

  // Set CSS styles to ensure the button is visible above the list element
  deleteButton.style.position = 'relative'; // Ensure the button is positioned relative to its container
  deleteButton.style.zIndex = '10'; // Set a high z-index to bring it above the list elements

  // Set the font family of deleteButton based on the most common font in child elements
  const childrenFonts = [...div.querySelectorAll('*')].filter(x=>!x.childElementCount&&!!x.innerText)
      .map(x => window.getComputedStyle(x).fontFamily.split(',')[0]);
  if (childrenFonts.length > 0) {
    const fontCount = new Map();
    childrenFonts.forEach(font => {
      fontCount.set(font, (fontCount.get(font) || 0) + 1);
    });
    const mostCommonFont = [...fontCount.entries()].reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0])[0];
    if (mostCommonFont) {
      deleteButton.style.fontFamily = mostCommonFont;
    }
  }

  deleteButton.addEventListener('click', (e) => {
    e.preventDefault();
    const originalParent = div.parentElement;
    actionStack.push({ parent: originalParent, div: div, startIndex: [...originalParent.children].indexOf(div), type: 'delete' });
    div.remove();
  });

  let target = div;
  let stack = [target];

  // Traverse the div to find the last descendant with width and height 100%
  while (stack.length > 0) {
    let current = stack.pop();
    const children = [...current.children];

    // If there are two children, append the delete button after them
    if (children.length >= 2) {
      current.appendChild(deleteButton);
      return;
    }

    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }

    // If this element has height and width 100%, set it as the target
    const style = window.getComputedStyle(current);
    if (style.height === '100%' && style.width === '100%') {
      target = current;
    }
  }

  // Append the delete button as a sibling of the target
  if (target !== div) {
      target.parentElement.appendChild(deleteButton)
  } else {
      div.appendChild(deleteButton);
  }
};

function clearHighlightedDivs() {
  for (const div of highlightedDivs) {
    div.style.border = '';
  }
  highlightedDivs = [];
}

function undoDeletion() {
  if (actionStack.length > 0) {
    const last = actionStack.pop();
    if (last.type === 'drag') {
        // swap indicies
        const refNode = last.parent.children[last.startIndex];

        // Move the element back to the original index
        if (refNode) {
          if (last.endIndex > last.startIndex) {
              last.parent.insertBefore(last.parent.children[last.endIndex], refNode);
          } else {
              last.parent.insertBefore(last.parent.children[last.endIndex], refNode.nextSibling);
          }
        } else {
          last.parent.appendChild(last.div);
        }
    } else if (last.type === 'delete') {
        // bring back at the index
        const refNode = last.parent.children[last.startIndex];
        if (refNode && last.startIndex !== last.parent.children.length) {
            last.parent.insertBefore(last.div, refNode);
        } else {
            last.parent.appendChild(last.div);
        }
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
      openLinksInNewTab();
      document.addEventListener('mouseover', handleMouseEvents);
      document.addEventListener('click', handleMouseEvents, true);
    }
    lastShiftClickTime = currentTime;
  } else if (event.key === 'Escape') {
    stopScanning();
  }
});

const checkDeletionButtons = () => {
  listParents.forEach(par => {
    [...(par.children)].forEach(child => {
      let deleteButtons = [...child.querySelectorAll('button')].filter(button => button.textContent.trim() === 'Delete');
      if (deleteButtons.length > 1) {
        // Somehow got 2 buttons, remove all but one
        for (let i = 0; i < deleteButtons.length; i++)
          deleteButtons[i].remove();

        addDeleteButton(child);
        //}
      } else if (!deleteButtons.length) {
        // Must be a new load, add a button while we're here
        finalDivs.push(child); // iffy on this, but seems to work
        addDraggableBehavior([child]);
        addDeleteButton(child);
        // Also
        openLinksInNewTab();
      } else {
        // Ensure the delete button is placed correctly
        const deleteButton = deleteButtons[0];
        let target = child;
        let stack = [target];

        while (stack.length > 0) {
          let current = stack.pop();
          const children = [...current.children];

          for (let i = children.length - 1; i >= 0; i--) {
            stack.push(children[i]);
          }

          const style = window.getComputedStyle(current);
          if (style.height === '100%' && style.width === '100%') {
            target = current;
          }
        }

        if (deleteButton && deleteButton !== target.lastElementChild) {
          deleteButton.remove();
          addDeleteButton(child);
        }
      }
    });
  });
};

setInterval(() => {
  checkDeletionButtons();
}, 1000);
