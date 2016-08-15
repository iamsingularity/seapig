const ipc = require('electron').ipcRenderer;
const webview = document.getElementById('previewer');
const fs = require('fs');
const path = require('path');
const storage = require('electron-json-storage');
const FIRST_ITEM = 0;
var currentFile = "";

// Initialize ace editor
var editor = ace.edit("ace-editor");
editor.setTheme("ace/theme/monokai");
editor.getSession().setMode("ace/mode/markdown");
editor.getSession().setUseWrapMode(true);
editor.focus();

// disable drag and drop to document
document.ondragover = document.ondrop = function(event) {
  event.preventDefault();
  return false;
};

// change keybindings
const keybindings = document.getElementById("keybindings");

function changeKeyBindings() {
  if (keybindings.value == "default") {
    editor.setKeyboardHandler(null);
  } else {
    editor.setKeyboardHandler(keybindings.value);
  }
  let json = {
    key_bindings: keybindings.selectedIndex
  };
  storage.set('key_bindings', json, function (error) {
    if (error) throw error;
  });
  editor.focus();
}

keybindings.addEventListener("change", changeKeyBindings);

// load keybindings
storage.get('key_bindings', function (error, data) {
  if (error) throw error;

  if (Object.keys(data).length === 0) {
    keybindings.selectedIndex = FIRST_ITEM;
  } else {
    keybindings.selectedIndex = data.key_bindings;
  }
  changeKeyBindings();
});
                    
// open file
const openBtn = document.getElementById("openBtn");
openBtn.addEventListener("click", function(event) {
  ipc.send('open-file-dialog', currentFile);
});

ipc.on('selected-file', function (event, fullpath) {
  currentFile = fullpath[0];
  fs.readFile(fullpath[0], function(error, text) {
    if (error != null) {
      alert ('error: ' + error);
      return;
    }
    editor.setValue(text.toString(), -1);
  });
});

// save file
const saveBtn = document.getElementById("saveBtn");
saveBtn.addEventListener("click", function(event) {
  if (currentFile == "") {
    ipc.send('save-new-file');
  } else {
    saveFile(currentFile);
  }
});

ipc.on('selected-save-file', function (event, filename) {
  saveFile(filename);
});

function saveFile(filename) {
    fs.writeFile (filename, editor.getValue(), function (error) {
      if (error != null) {
        alert ('error: ' + error + '\n' + filename);
        return;
      }
      currentFile = filename;
    });
}

// export html
const exportHTMLBtn = document.getElementById("exportHTMLBtn");
exportHTMLBtn.addEventListener("click", function (event) {
  ipc.send('export-HTML', currentFile);
});

ipc.on('selected-HTML-file', function (event, filename) {
  webview.send('export-HTML', filename);
});

// export pdf
const exportPdfBtn = document.getElementById("exportPdfBtn");
exportPdfBtn.addEventListener("click", function (event) {
  ipc.send('export-pdf-file', currentFile);
});

ipc.on('selected-pdf-file', function (event, filename) {
  webview.printToPDF({}, (error, data) => {
    if (error) throw error
      fs.writeFile(filename, data, (error) => {
        if (error) throw error
          console.log('Write PDF successfully.')
      })
  })
});

// Emitted whenever the document is changed
editor.on("change", function (e) {
  if (e.lines.length > 1) {
    let baseURI = "";
    if (currentFile != "") {
      baseURI = 'file://' + path.dirname(currentFile) + '/';
    }
    webview.send('preview', editor.getValue(), baseURI);
  }
});

