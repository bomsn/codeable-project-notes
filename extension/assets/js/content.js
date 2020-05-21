// content.js
(() => {
  // Define any needed block-scoped variable
  let projectId = null, // Stores the id of current project
      projectData = { title : '', notes : {} } // Sotres the title and notes of the current project
      notesBtn = null, // Stores the notes button
      notesBox = null, // Stores the notes box popup element
      isStored = true, // Store saving status ( if a save is performed or not ), set to true by default to prevent any saving/removing from storage if the notes box is not updated
      ctrlDown = false, // store whether the keyboard ctrl button is pressed
      typingTimer = null, // store the delayed saving timer
      body = document.getElementsByTagName('body')[0]; // the body element;

  let icons = {
    note: chrome.extension.getURL('assets/icons/icon.svg'),
    close: chrome.extension.getURL('assets/icons/close.svg'),
    addNote: chrome.extension.getURL('assets/icons/add-note.svg'),
    removeNote: chrome.extension.getURL('assets/icons/remove-note.svg'),
    addTasks: chrome.extension.getURL('assets/icons/add-tasklist.svg'),
  }

  const init = {
    // Conditionally load elements if the current view is a project view
    maybeStart : ( event ) => {
      helper.isTaskView( (id) => { // Success callback
        if( projectId !== id   ){
          helper.maybeReset();
          init.start( id );
        }
      }, (id) => {  // Failure callback
        helper.maybeReset();
      } );
    },
    // Build our sequenctal preparation function
    start : ( taskID ) => {
      projectId = taskID;
      new Promise( (resolve, reject) => {
        if( typeof projectId !== 'undefined' && typeof projectId !== null ){
          // Retrieve project title and available Project notes and assign them {projectNotes}
          chrome.storage.sync.get(projectId, (result) => {
              if( chrome.runtime.lastError ){
                reject( new Error(chrome.runtime.lastError.message) );
              }else{
                if( typeof result[projectId] !== 'undefined' && result[projectId] instanceof Object ){
                  projectData = result[projectId];
                }
                // If nothing was saved already, retrieve the title and assign it (notes to be assigned later by the user)
                if( !("title" in projectData) || typeof projectData.title == undefined || projectData.title == '' || projectData.title == 'untitled' ){
                  projectData.title = helper.retrieveProjectTitle();
                }
                resolve();
              }
            });
        }else{
          reject( new Error( 'Proejct ID is not available' ) );
        }
      }).then( () => {
        // Finally show the notes button on Codeable
        load.projectNotesBtn();
      }).catch( (e) => {
        console.log(e);
      });
    },
  }
  const load = {
    // Helper to show notes btn and set any necessary eventListeners
    projectNotesBtn : () => {

      // if the project notes box is not already defined, define it
      if( notesBtn == null || notesBtn == undefined || notesBtn == '' ){
        notesBtn = getter.projectNotesBtn();
      }
      // Append to the document body
      document.body.appendChild(notesBtn);
      // Set necessary eventListeners
      notesBtn.addEventListener("click", handle.notesbtnClick, false);
      // After it's appended to the dom and the event listeners are created, unset the global variable
      notesBtn = null;
    },
    // Helper to show notes box and set any necessary eventListeners
    projectNotesBox : () => {
      // if the project notes box is not already defined, define it
      if( notesBox == null || notesBox == undefined || notesBox == '' ){
        notesBox = getter.projectNotesBox();
      }
      // Append to the document body
      document.body.appendChild(notesBox);
      // Set necessary eventListeners ( using event delegation )
      notesBox.addEventListener("click", handle.notesBoxClick, false);
      notesBox.addEventListener("keydown", handle.typing, false);
      notesBox.addEventListener("keyup", handle.typing, false);
      notesBox.addEventListener("paste", handle.pasting, false);
      notesBox.addEventListener("mouseleave", handle.movingAway, false);
      // After it's appended to the dom and the event listeners are created, unset the global variable
      notesBox = null;
    }
  }
  const remove = {
    // Helper to remove notes button from the DOM, in addition to removing any associated eventListeners
    projectNotesBtn : () => {
      let btn = document.getElementById('codeable_notes_btn');
      if( btn !== null ){
        // Remove associated event listener
        btn.removeEventListener("click", handle.notesbtnClick, false);
        // Remove the box from the DOM
        btn.parentNode.removeChild(btn);
        // Make sure to set the associated global variable to null
        if( notesBtn !== null ){
          notesBtn = null;
        }
      }
    },
    // Helper to remove notes box from the DOM, in addition to removing any associated eventListeners
    projectNotesBox : () => {
      let box = document.getElementById('codeable_notes_box');
      if( box !== null ){
        // Remove associated event listener
        box.removeEventListener("click", handle.notesBoxClick, false);
        box.removeEventListener("keydown", handle.typing, false);
        box.removeEventListener("keyup", handle.typing, false);
        box.removeEventListener("paste", handle.pasting, false);
        box.removeEventListener("mouseleave", handle.movingAway, false);
        // Remove the box from the DOM
        box.parentNode.removeChild(box);
        // Make sure to set the associated global variable to null
        if( notesBox !== null ){
          notesBox = null;
        }
      }
    }
  }
  const handle = {
    // Helper function to handle clicks on notes btn
    notesbtnClick : (event) => {
      event.preventDefault;
      // Only show the box it's not already defined, otherwise, remove it
      let box = document.getElementById('codeable_notes_box');
      if( box !== null ){
        remove.projectNotesBox();
      }else{
        load.projectNotesBox();
      }
    },
    // Helper function to handle clicks on notes box
    notesBoxClick : (event) => {
      event.preventDefault;
      if( !event.target ){
        return;
      }

      /*
      * CLOSE MODAL
      */
      if ( event.target.matches('.notes-modal-close') || event.target.parentNode.matches('.notes-modal-close') ) {
        remove.projectNotesBox();
        return;
      }
      /*
      * ADD NEW
      */
      if (event.target.matches('.notes-modal-add-note') || event.target.parentNode.matches('.notes-modal-add-note')  ) {
        let notesParentContainer = document.getElementById('codeable_notes_box'),
            notesContainers = notesParentContainer.getElementsByClassName('notes_box_body')[0],
            availableNotes = notesContainers.getElementsByClassName('single-note-container'),
            emptyNote = getter.singleNotesBox();

        // Remove the class (active) from all active notes
        for (var i = 0; i < availableNotes.length; i++) {
           availableNotes[i].classList.remove('active');
        }
        // Add the class active to the empty note, and prepend it to the notes container
        emptyNote.classList.add('active');
        notesContainers.insertBefore(emptyNote, notesContainers.firstChild).focus();
        // Check if we need to remove the "no notes" message
        let noNotes = notesContainers.getElementsByClassName('no_notes_notice');
        if( noNotes.length > 0 ){
          notesContainers.removeChild(noNotes[0]);
        }
        return;
      }
      /*
      * DELETE
      */
      if (event.target.matches('.notes-modal-delete-note') || event.target.parentNode.matches('.notes-modal-delete-note') ) {
        let selectedNote = event.target.closest(".single-note-container"),
            selectedNoteKey = selectedNote.getAttribute('data-id');
        // Remove the note element from the DOM
        selectedNote.parentNode.removeChild(selectedNote);
        // Remove the note from storage
        setter.unset(selectedNoteKey);

        // Check if we need to add "no notes" message
        // Check if we need to remove the "no notes" message
        let notesContainers = document.getElementById('codeable_notes_box').getElementsByClassName('notes_box_body')[0],
            availableNotes = notesContainers.getElementsByClassName('single-note-container');
        if( availableNotes.length === 0 ){
          notesContainers.appendChild( getter.noNotes() );
        }
        return;
      }
      /*
      * HIGHLIGHT
      */
      if (event.target.matches('.notes-modal-edit-note') || event.target.parentNode.matches('.notes-modal-edit-note') ) {
        let notesParentContainer = document.getElementById('codeable_notes_box'),
            availableNotes = notesParentContainer.getElementsByClassName('single-note-container'),
            selectedNote = event.target.closest(".single-note-container");
        // Remove the class (active) from all active notes
        for (var i = 0; i < availableNotes.length; i++) {
           availableNotes[i].classList.remove('active');
        }
        // Add the class (active) to the selected note
        selectedNote.classList.add('active');
        return;
      }
      /*
      * UN-HIGHLIGHT
      */
      if (event.target.matches('.notes-modal-save-note') ) {
        let selectedNote = event.target.closest(".single-note-container");
        selectedNote.classList.remove('active');
        return;

      }
    },
    // Helper function to handle typing event on the note fields
    typing : (event) => {
      if( !event.target ){
        return;
      }

      if ( event.target.matches('.notes-modal-edit-note') || event.target.parentNode.matches('.notes-modal-edit-note') ) {

        if( event.type == 'keydown' ){
          let realEventType = helper.getKeyboardEventType(event);
          if( realEventType == 'preTyping' ){
            handle.preTyping( event, realEventType );
          }
        }

        if( event.type == 'keyup' ){
          let realEventType = helper.getKeyboardEventType(event);
          if( realEventType == 'postTyping' || realEventType == 'cut' || realEventType == 'remove' ){
            handle.postTyping( event, realEventType );
          }
        }

        return;
      }
    },
    // Helper function to handle pasting event on the note fields
    pasting : (event) => {

      if( ! event.target ){
        return;
      }

      if ( event.target.matches('.notes-modal-edit-note') || event.target.parentNode.matches('.notes-modal-edit-note') ) {
        let selectedElement = event.target.matches('.notes-modal-edit-note') ? event.target : event.target.parentNode,
            selectedElementText = selectedElement.textContent,
            maxlength = selectedElement.getAttribute('maxlength'),
            clipboardData = event.clipboardData.getData('text/plain');
        // Check if the pasted text + existing text is longer than the maximum, if so, strip it out
        if( ( clipboardData.length + selectedElementText.length ) > maxlength   ){
          event.preventDefault();
        }
      }
    },
    // Helper function to handle saving data on typing
    preTyping : (event, eventType) => {
      let selectedElement = event.target.matches('.notes-modal-edit-note') ? event.target : event.target.parentNode,
          selectedElementText = selectedElement.textContent,
          maxlength = selectedElement.getAttribute('maxlength');
      // Prevent typing after the limit is reached
      if( selectedElementText.length >= maxlength  ){
        event.preventDefault();
        return false;
      }
    },
    // Helper function to handle saving data on typing
    postTyping : (event, eventType) => {
      let noteContainer = event.target.closest(".single-note-container"),
          key = noteContainer.getAttribute('data-id'),
          titleEditor = noteContainer.getElementsByClassName('note-title-textareaElement'),
          noteEditor = noteContainer.getElementsByClassName('note-text-textareaElement'),
          title = titleEditor[0].textContent,
          note = noteEditor[0].textContent;

      setter.set( title, note, key );
    },
    // Helper function to handle saving when the cursor is moving outside the box
    movingAway : (event) => {
      if( !isStored ){
        setter.updateStorage();
      }
    }
  }
  const getter = {
    // Helper to build notice box button
    projectNotesBtn : () => {
      let btn = document.createElement("a"),
          btnIcon = chrome.extension.getURL('assets/icons/icon.svg'),
          btnHTML = '<img class="codeable-floating-btn-icon" src="'+ btnIcon +'" />';

      // Set button ID and classes
      btn.setAttribute("id", "codeable_notes_btn");
      btn.setAttribute("class", "codeable_floating_btn");
      // Set button inner HTML
      btn.innerHTML = btnHTML.trim();

      return btn;
    },
    // Helper to build notice box
    projectNotesBox : () => {
      let notes = helper.reverseObject(projectData.notes), // reverse array so we can start from the last one
          box = document.createElement("div"),
          html = '';
      // Set button ID and classes
      box.setAttribute("id", "codeable_notes_box");
      box.setAttribute("class", "codeable_floating_box");

      /*
      * Build box markup
      */

      // Header
      html += '<div class="notes_box_head">';
      html += '<span class="notes_box_head_title">Project Notes <small>for Codeable</small></span>';
      html += '<span class="notes_box_head_close notes-modal-close"><img src="'+ icons.close +'" /></span>';
      html += '</div>';

      // Take note button
      html += '<div class="notes_box_buttons">';
      html += '<span class="notes_box_btn_add notes-modal-add-note" style="user-select: none;"><img src="'+ icons.addNote +'" /><em>Take a note</em></span>';
      // html += '<span class="notes_box_head_add_tasks notes-modal-add-tasks"><img src="'+ icons.addTask +'" /></span>'; // To be added
      html += '</div>';

      // Notes or no notes message
      html += '<div class="notes_box_body">';

      if( Object.keys(notes).length > 0 ){
        for (let [key, value] of Object.entries(notes)) {
          html += getter.singleNotesBox( key, value.label, value.note, false );
        }
      }else{
        html += getter.noNotes( false );
      }

      html += '</div>';

      // Footer
      html += '<div class="notes_box_footer">';
      html += '<span class="credit">By Ali Khallad</span>';
      html += '</div>';

      box.innerHTML = html.trim();
      return box;
    },
    // Helper to get single notes box
    singleNotesBox : ( key = '', title = '' , note  = '', returnElement = true ) => {
      let html = '',
          element = '';

      // Set a random key if not already defined
      if( key == '' ){
        key = helper.generateKey();
      }
      /*
      * Prepare the box wrapper
      */
      if( ! returnElement ){
        html +='<div class="single-note-container" data-id="'+ key +'">';
      }else{
        element = document.createElement("div");
        element.setAttribute("class", "single-note-container");
        element.setAttribute("data-id", key);
      }

      /*
      * Prepare the box's inner markup
      */
      // Remove button
      html +='<div role="button" class="notes-modal-delete-note" tabindex="0" style="user-select: none;"><img src="'+ icons.removeNote +'" /></div>';

      // Text area
      html +='<div class="single-note-text">';
      html +='<div class="note-title-textareaElement notes-modal-edit-note" style="min-height: 17px;" placeholder="Title" contenteditable="plaintext-only" spellcheck="false" maxlength="100">'+ title +'</div>';
      html +='<div class="note-text-textareaElement notes-modal-edit-note" style="min-height: 17px;" placeholder="Note..." contenteditable="plaintext-only" spellcheck="false" maxlength="5000">'+ note +'</div>';
      html +='</div>';
      // Save Button
      html +='<div class="single-note-save-wrapper">';
      html +='<div role="button" class="notes-modal-save-note" tabindex="0" style="user-select: none;">Done</div>';
      html +='</div>';

      /*
      * Close the box wrapper
      */
      if( ! returnElement ){
        html +='</div>';
      }

      // Retun an element if returnElement is set to true, otherwise, return a string
      if( ! returnElement ){
        return html;
      }else{
        element.innerHTML = html.trim();
        return element;
      }

    },
    // Helper to get "no notes" message
    noNotes : ( returnElement = true ) => {

      let html = '',
          element = '';

      if( ! returnElement ){
        html +='<div class="no_notes_notice">';
      }else{
        element = document.createElement("div");
        element.setAttribute("class", "no_notes_notice");
      }

      html +='<span class="no_notes_icon"style="background-image:url('+ icons.note +')"></span><span class="no_notes_text">You Haven\'t Added Notes to This Project</span>';

      if( ! returnElement ){
        html +='</div>';
      }

      // Retun an element if returnElement is set to true, otherwise, return a string
      if( ! returnElement ){
        return html;
      }else{
        element.innerHTML = html.trim();
        return element;
      }
    },
  }
  const setter = {
    set : (label, note, key) => {

      if( label == '' && note == '' && key !== ''  ){
        setter.unset(key);
      }else{
        let noteObj = {};
        noteObj[key] = {
          label: label,
          note: note,
          lastUpdated: (new Date()).toISOString(),
        };

        console.log(projectData);
        // Add the note to projectNotes object
        Object.assign(projectData.notes, noteObj);

        console.log(projectData);
        // Delay saving
        isStored = false;
        setter.delayedSave();
      }
    },
    unset : (key) => {
      // Delete key and its value from the notes array
      if( key in projectData.notes  ){
        delete projectData.notes[key];
        // Delay saving
        isStored = false;
        setter.delayedSave();
      }
    },
    updateStorage : () => {
      console.log('Saving process started...');
      helper.maybeClearStorageTimer();
      // Save the project notes to storage after it's updated
      if( !isStored && projectId !== null ){
        isStored = true;
        if( Object.keys(projectData.notes).length  > 0 ){

          let data = {},
              currentDate = (new Date()).toISOString();
          // Add the time it was updated to the object before saving
          projectData.lastUpdated = currentDate
          data[projectId] = projectData;

          chrome.storage.sync.set(data, function() {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError.message);
            }
          });
        }else{
          chrome.storage.sync.get(projectId, function(items) {
              if (items[projectId]) {
                chrome.storage.sync.remove(projectId);
              }
          });
        }
      }
    },
    delayedSave : () => {

      helper.maybeClearStorageTimer();
      typingTimer = setTimeout( () => {
        // Save the projectNotes object to storage
        setter.updateStorage();
      }, 6000);

    },
  }
  const helper = {
    isTaskView : ( success = () =>{} , fail  = () =>{}  ) => {
      // Check if the current view is a project view
      // If the current view is a project, run the success callback
      // If the current view is not a project, run the fail callback

      let pathname = window.location.pathname,
          reg = /tasks\/([0-9]+)/,
          id = 0;

      id = reg.exec( pathname );
      id = id !== null && typeof id[1] !== 'undefined' && !isNaN(id[1]) && id[1] > 0 ? id[1] : 0;

      if( id > 0 ){
        if( typeof success == "function" ) success(id);
      }else{
        if( typeof fail == "function" ) fail(id);
      }

    },
    generateKey : ( data = false ) => {

      let key = Math.random().toString(36).substr(2, 20);
      if( data !== false && data instanceof Object && key in data  ){
        return helper.generateKey(data);
      }

      let notesCount = Object.keys(projectData.notes).length.toString();
      return notesCount + key;
    },
    // To get precise results, this need to be hooked to 'keyup' and 'keydown' events under the same conditional logic
    getKeyboardEventType : ( event ) => {

      let eventType = event.type == 'keydown' ? 'preTyping' : 'postTyping';

      if( event.type == 'keydown' ){
        // Set to true if Ctrl button is pressed
        if( event.keyCode == 17 || event.keyCode == 91 ){
          if( ctrlDown === false){
            ctrlDown = true;
          }
          eventType = 'idle';
        }
      }

      if( ctrlDown && ( event.keyCode == 67 || event.keyCode == 86 ||  event.keyCode == 65 ||  event.keyCode == 88 ) ){
        switch(event.keyCode){
          case 67:
            eventType = 'copy';
            break;
          case 86:
            eventType = 'paste';
            break;
          case 65:
            eventType = 'select';
            break;
          case 88:
            eventType = 'cut';
            break;
        }
      }else{
        switch(event.keyCode){
          case 8:
            eventType = 'remove';
            break;
          case 36:
            eventType = 'moveLStart';
            break;
          case 35:
            eventType = 'moveEnd';
            break;
          case 37:
            eventType = 'moveLeft';
            break;
          case 39:
            eventType = 'moveRight';
            break;
          case 9:
            eventType = 'moveNext';
            break;
        }
      }

      if( event.type == 'keyup' ){
        if( ctrlDown === true ){
          if( ( event.keyCode == 17 || event.keyCode == 91 ) ){
            ctrlDown = false;
          }
          eventType = 'idle';
        }

      }
      return eventType;

    },
    retrieveProjectTitle : () => {
      let titleElement = document.getElementsByTagName('h1'),
          projectTitle = titleElement !== null && titleElement[0] !== undefined ? titleElement[0].textContent : '';

      return projectTitle;
    },
    reverseObject : ( object ) => {

      let newObject = {},
          keys = [];

      for ( let key in object) {
          keys.push(key);
      }

      for ( let i = keys.length - 1; i >= 0; i--) {
        let value = object[keys[i]];
        newObject[keys[i]]= value;
      }

      return newObject;

    },
    maybeClearStorageTimer : () => {
      if( typingTimer !== null ){
        clearTimeout (typingTimer);
        typingTimer = null;
        return true;
      }
      return false;
    },
    maybeReset : () => {
      if( projectId !== null ){
        helper.reset();
        return true;
      }
      return false;
    },
    reset : () => {
      // Make sure storage is updated before reset
      setter.updateStorage();
      // Reset all data and remove DOM element created
      projectId = null;
      projectData = { title : '', notes : {} };
      remove.projectNotesBtn();
      remove.projectNotesBox();
    }
  }


  /*
  * Watch out for body css class changes and refresh the elements based on that (since codeable pages are dynmaically updated)
  */
  new MutationObserver( (mutations) => {
    if( mutations.length > 0 ){
      let currentBodyClasses = mutations[0].target.className !== undefined ? mutations[0].target.className : '',
          previousBodyClasses = mutations[0].oldValue !== undefined ? mutations[0].oldValue : '';
      if( currentBodyClasses.includes('pace-done') && !previousBodyClasses.includes('pace-done') ){
        // Codeable finished loading
        init.maybeStart(mutations[0]);
      }else if( !currentBodyClasses.includes('pace-done')  && previousBodyClasses.includes('pace-done')  ){
        // Codeable loading in progress
        init.maybeStart(mutations[0]);
      }
    }
  }).observe(body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });

  /*
  * Make sure everything is saved before the user leaves the page
  */
  window.addEventListener('beforeunload', (event) => {
    setter.updateStorage();
  }, false);

  /*
  * Event listeners can be used when MutationObserver is not needed
  */
  // // Load everything after the DOM is loaded ( Start our series of actions to prepare the notes box, and display notes button )
  // window.addEventListener('load', init.start, false);
  // // make sure that the elements are refreshed when the user switch back and forth in browser hsitory
  // window.addEventListener('popstate', init.start, false);


})()
