// content.js
(() => {
  let projects,
      nav = document.getElementById('navArea'),
      backButton = nav.children.backButton,
      root = document.getElementById('root'),
      projectsView = root.children.projectsView,
      notesView = root.children.notesView,
      loader = root.children.loader;

  const init = {
    // Retrieve storage data and use as needed
    start : (event) => {
      new Promise( (resolve, reject) => {
        // Retrieve project title and available Project notes and assign them {projectNotes}
        chrome.storage.sync.get( null, ( storedProjects ) => {
            if( chrome.runtime.lastError ){
              reject( chrome.runtime.lastError.message );
            }else if( Object.keys(storedProjects).length === 0 ){
              reject( 'You Haven\'t Added Notes Yet!' );
            }else{
              resolve( storedProjects );
            }
          });
      }).then( (storedProjects) => {
        projects = storedProjects;
        load.projects();
      }).catch( ( msg ) => {
        if( typeof msg == "object" ){
          console.error(msg);
          msg = "An error occured, check the console.";
        }
        load.template('error', projectsView, { message: msg } );
        helper.displayView('projects');
      });
    },
  }
  const load = {
    projects : () => {
      let html = '';
      if( Object.keys(projects).length > 0 ){
        for (let [key, value] of Object.entries(projects)) {
          if( Object.keys(value).length > 0  ){
            let tags = {
              id : key,
              title : value.title,
              color : helper.randomColor(),
            }
            html += get.template('project', tags, false);
          }
        }
      }

      if( html.length === 0 ){
        html += get.template('error', { message: 'Nothing to show :)' }, false);
      }

      projectsView.innerHTML = html;
      helper.displayView('projects');
    },
    projectNotes : ( projectId ) => {
      let html = '';
      if( projectId in projects && Object.keys(projects[projectId].notes).length > 0 ){
        let notesObj = helper.reverseObject(projects[projectId].notes);
        for (let [key, value] of Object.entries(notesObj)) {
            let tags = {
              projectId : projectId,
              key : key,
              label : value.label,
              note : value.note,
              color : helper.randomColor(),
              time : "lastUpdated" in value  && typeof value.lastUpdated !== undefined && value.lastUpdated.toString() !== '' ? helper.timeSince(value.lastUpdated) : '',
            }
            html += get.template('projectNote', tags, false);
        }
      }

      if( html.length === 0 ){
        html += get.template('error', { message: 'Nothing to show for this project :)' }, false);
      }
      notesView.innerHTML = html;
      helper.displayView('notes');
    },
    template : ( id, destination, tags = {} ) => {
      let temp = get.template(id, tags);

      // If an ID is provided, retrieve the element from DOM
      if( typeof destination == 'string' ){
        destination = document.getElementById(destination);
      }

      destination.innerHTML = '';
      destination.appendChild(temp);
      helper.hideLoader();
    },
  }
  const get = {
    template : ( id, tags = {}, element = true ) => {

      let temp = document.getElementById( id ),
          clone = temp.innerHTML;
      if( Object.keys(tags).length > 0 ){
        for (let [key, value] of Object.entries(tags)) {
          let reg = new RegExp("{" + key + "}", "g");
          value = value !== undefined ? value.toString() : '';
          clone = clone.replace( reg, value.trim() );
        }
      }

      if( element ){
        let cloneElement = document.createElement('div');
        cloneElement.innerHTML = clone.trim();
        clone = cloneElement.firstChild;
      }

      return clone;
    },
  }
  const handle = {
    // Helper function to handle clicks on popup
    navClicks : (event) => {
      event.preventDefault;
      if( !event.target ){
        return;
      }

      /*
      * Go back to projects view
      */
      if ( event.target.matches('.notes_box_head_back') || event.target.parentNode.matches('.notes_box_head_back') ) {
        helper.showLoader();
        helper.displayView('projects');
        notesView.innerHTML = '';
        return;
      }

    },
    rootClicks : (event) => {
      event.preventDefault;
      if( !event.target ){
        return;
      }

      /*
      * Open Project
      */
      if ( event.target.matches('.view-project-notes') || event.target.parentNode.matches('.view-project-notes') ) {
        helper.showLoader();
        let selectedProject = event.target.closest(".single-project-card"),
            projectId = selectedProject.getAttribute('data-id');

        load.projectNotes(projectId);
        return;
      }
      /*
      * Delete Project
      */
      if ( event.target.matches('.remove-project-notes') || event.target.parentNode.matches('.remove-project-notes') ) {
        let selectedProject = event.target.closest(".single-project-card"),
            projectsContainer = selectedProject.closest("#projectsView"),
            projectCount = projectsContainer.getElementsByClassName('single-project-card'),
            projectId = selectedProject.getAttribute('data-id');

        // Hide element, then remove it after one second
        selectedProject.style.opacity = '0';
        setTimeout( () => {
          selectedProject.parentNode.removeChild(selectedProject);
          if( projectCount.length === 0 ){
            helper.showLoader();
            load.projects();
          }
        }, 500);
        // Delete project from storage
        setter.deleteProject(projectId);
        return;
      }
      /*
      * Delete Note
      */
      if ( event.target.matches('.remove-project-single-note') || event.target.parentNode.matches('.remove-project-single-note') ) {
        let selectedNote = event.target.closest(".single-note-card"),
            notesContainer = selectedNote.closest("#notesView"),
            noteCount = notesContainer.getElementsByClassName('single-note-card'),
            projectId = selectedNote.getAttribute('data-id');
            noteKey = selectedNote.getAttribute('data-key');

        // Hide element, then remove it after one second
        selectedNote.style.opacity = '0';
        setTimeout( () => {
          selectedNote.parentNode.removeChild(selectedNote);
          if( noteCount.length === 0 ){
            helper.showLoader();
            load.projects();
          }
        }, 500);
        // Delete project note from storage
        setter.deleteNote(projectId, noteKey);
        return;
      }

    }
  }
  const setter = {
    deleteProject: (projectId) => {
      // Delete key and its value from the notes internal object and storage object as well
      if( projectId in projects ){
        // Delete from current object
        delete projects[projectId];
        // Delete from storage
        chrome.storage.sync.get(projectId, function(items) {
          if (items[projectId]) {
            chrome.storage.sync.remove(projectId);
          }
        });
      }
    },
    deleteNote: (projectId, noteKey) => {
      // Delete key and its value from the notes array
      if( noteKey in projects[projectId].notes  ){
        // Delete from current object
        delete projects[projectId].notes[noteKey];
        // Delete from storage
        if( Object.keys(projects[projectId].notes).length  > 0 ){
          let data = {};
          data[projectId] = projects[projectId];
          chrome.storage.sync.set(data, function() {
            if (chrome.runtime.lastError) {
              console.log(chrome.runtime.lastError.message);
            }
          });
        }else{
          // If the last note is deleted, delete the Project
          setter.deleteProject(projectId);
        }
      }
    },
  }
  const helper = {
    displayView : ( view ) => {
      console.log(view);
      console.log(projectsView);
      if( view == 'projects' ){
        helper.hide(notesView);
        helper.hide(backButton);
        helper.unhide(projectsView);
      }else if( view == 'notes' ){
        helper.hide(projectsView);
        helper.unhide(notesView);
        helper.unhide(backButton);
      }
      helper.hideLoader();
    },
    randomColor : () => {
      let letters = '0123456789ABCDEF',
          color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    },
    timeSince : ( date ) => {
      let seconds = Math.floor((new Date() - new Date( date )) / 1000),
          interval = Math.floor(seconds / 31536000);

      if (interval > 1) {

        return isNaN(interval) ? '' : interval + " years ago";
      }
      interval = Math.floor(seconds / 2592000);
      if (interval > 1) {
        return isNaN(interval) ? '' : interval + " months ago";
      }
      interval = Math.floor(seconds / 86400);
      if (interval > 1) {
        return isNaN(interval) ? '' : interval + " days ago";
      }
      interval = Math.floor(seconds / 3600);
      if (interval > 1) {
        return isNaN(interval) ? '' : interval + " hours ago";
      }
      interval = Math.floor(seconds / 60);
      if (interval > 1) {
        return isNaN(interval) ? '' : interval + " minutes ago";
      }
      return isNaN(interval) ? '' : Math.floor(seconds) + " seconds ago";
    },
    showLoader : () => {
      loader.classList.add('active');
    },
    hideLoader : () => {
      loader.classList.remove('active');
    },
    hide : (e) => {
      e.classList.add('hidden');
    },
    unhide : (e) => {
      e.classList.remove('hidden');
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
  }

  /*
  * Create the needed event listeners
  */
  window.addEventListener('load', init.start, false);
  nav.addEventListener('click', handle.navClicks, false);
  root.addEventListener('click', handle.rootClicks, false);

})()
