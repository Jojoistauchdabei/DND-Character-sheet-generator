/* editor – aus index.html ausgelagert, Verhalten unveraendert. */
    let currentEditorTargetId = null;

    function openTextEditor(targetId, title) {
      currentEditorTargetId = targetId;
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;
      const overlay = document.getElementById('editorOverlay');
      const titleSpan = document.getElementById('editorTargetTitle');
      const editorContent = document.getElementById('editorContent');
      if (titleSpan) titleSpan.textContent = (title || targetId).toUpperCase();
      if (editorContent) {
        editorContent.innerHTML = targetEl.innerHTML;
      }
      if (overlay) {
        overlay.classList.add('active');
        setTimeout(() => { if (editorContent) editorContent.focus(); }, 50);
      }
    }

    function closeTextEditor() {
      const overlay = document.getElementById('editorOverlay');
      if (overlay) overlay.classList.remove('active');
      currentEditorTargetId = null;
    }

    function saveTextEditor() {
      if (!currentEditorTargetId) return;
      const targetEl = document.getElementById(currentEditorTargetId);
      const editorContent = document.getElementById('editorContent');
      if (targetEl && editorContent) {
        targetEl.innerHTML = editorContent.innerHTML;
        save();
      }
      closeTextEditor();
    }

    function applyEditorFormat(val) {
      if (!val) return;
      if (val === 'p' || val === 'h1' || val === 'h2' || val === 'h3') {
        document.execCommand('formatBlock', false, '<' + val + '>');
      } else if (val.startsWith('font-')) {
        document.execCommand('fontSize', false, val.replace('font-', ''));
      }
    }

    document.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('editorOverlay');
      if (!overlay || !overlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeTextEditor();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveTextEditor();
      }
    });
