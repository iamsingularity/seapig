const {ipcRenderer} = require('electron');
const marked = require('marked');
const renderer = new marked.Renderer();
const hljs = require('highlight.js');
const fs = require('fs');
const path = require('path');
const Viz = require("viz.js");
const uiflow = require("uiflow");

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: false
});

// escape HTML special characters
// from: http://qiita.com/noriaki/items/4bfef8d7cf85dc1035b3#comment-3e30a57522c7d6833a7f
var escapeHtml = (function (String) {
  var escapeMap = {
    '&': '&amp;',
    '\x27': '&#39;',
    '"': '&quot;',
    '<': '&lt;',
    '>': '&gt;'
  };

  function callbackfn (char) {
    if (!escapeMap.hasOwnProperty(char)) {
      throw new Error;
    }

    return escapeMap[char];
  }

  return function escapeHtml (string) {
    return String(string).replace(/[&"'<>]/g, callbackfn);
  };
}(String));

// redering code
renderer.code = function (code, language) {
  const CONV_ERR_HEAD = "\n******************* Convert Error *******************\n";
  const CONV_ERR_TAIL = "*****************************************************\n";
  if (language == "graphviz") {
    let result;
    try {
      result = Viz(code);
      return result;
    } catch (error) {
      return '<pre><code>' + hljs.highlightAuto(code).value + CONV_ERR_HEAD + error + CONV_ERR_TAIL +'</code></pre>';
    }
  } else if(language == "uiflow") {
    try {
      let dot = uiflow.compile(code);
      return Viz(dot);
    } catch (error) {
      console.log(error);
      return '<pre><code>' + escapeHtml(code) + CONV_ERR_HEAD + error + '\n' + CONV_ERR_TAIL +'</code></pre>';
    }
  } else {
    return '<pre><code>' + hljs.highlightAuto(code).value + '</code></pre>';
  }
}

// rendering list
renderer.listitem = function (text) {
  if (text.startsWith("[x]")) {
    return '<li class="task-list-item"><input type="checkbox" checked="true" disabled="true">' + text.slice(3) + '</li>';
  } else if (text.startsWith("[ ]")) {
    return '<li class="task-list-item"><input type="checkbox" disabled="true">' + text.slice(3) + '</li>';
  } else {
    return '<li>' + text + '</li>';
  }
}

// rendering html (sanitize script)
renderer.html = function (html) {
  if (html.match(/<[^>]*script[^>]*>/g) !== null) {
    return '<pre><code>' + escapeHtml(html).trim() + '</code></pre>';
  } else if (html.match(/<[^>]* on[^=>]*=/) !== null) {
    return '<pre><code>' + escapeHtml(html).trim() + '</code></pre>';
  } else {
    return html;
  }
}

// request preview
ipcRenderer.on('preview', function(event, data, baseURI) {
  let base = document.getElementsByTagName("base")[0];
  if (baseURI != "") {
    base.setAttribute("href", baseURI);
  }
  base.setAttribute("target", "_blank");
  document.getElementById('body').innerHTML = marked(data, { renderer: renderer });
  document.title = document.getElementsByTagName("h1")[0].innerHTML;
});

// request export HTML
ipcRenderer.on('export-HTML', function(event, filename) {
  let base = document.getElementsByTagName("base")[0];
  base.removeAttribute("href");
  base.removeAttribute("target");

  // http://blog.mudatobunka.org/entry/2015/12/23/211425#postscript
  fs.writeFile (filename, new XMLSerializer().serializeToString(document), function (error) {
    if (error != null) {
      alert ('error: ' + error + '\n' + filename);
      return;
    }
    let src_css = path.join(__dirname, '../templates/github.css');
    let dest_css = path.join(path.dirname(filename), "github.css");
    fs.createReadStream(src_css).pipe(fs.createWriteStream(dest_css));
  });

  base.setAttribute("target", "_blank");
});

