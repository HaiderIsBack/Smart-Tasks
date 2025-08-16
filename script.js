let draggedEntry = null;
let sourceTaskItem = null;

// Set draggable on drag indicator icons
document.querySelectorAll('.task-item .entry .material-symbols-outlined').forEach(icon => {
    icon.setAttribute('draggable', 'true');
    icon.addEventListener('dragstart', function (e) {
        draggedEntry = icon.parentElement;
        sourceTaskItem = icon.closest('.task-item');
        e.dataTransfer.effectAllowed = 'move';
    });
});

// Allow drop on all task-item slots
document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('dragover', function (e) {
        e.preventDefault();
    });

    item.addEventListener('drop', function (e) {
        e.preventDefault();
        if (!draggedEntry || !sourceTaskItem) return;

        const targetEntry = item.querySelector('.entry');
        if (targetEntry) {
            // Swap entries
            sourceTaskItem.appendChild(targetEntry);
            item.appendChild(draggedEntry);
        } else {
            // Move entry to empty slot
            item.appendChild(draggedEntry);
        }
        draggedEntry = null;
        sourceTaskItem = null;
        saveEntries(); // <-- Save after swap/move
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const headerTitle = document.querySelector('.header h1');
    if (headerTitle) {
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'long' });
        const year = now.getFullYear();
        headerTitle.textContent = `${month} ${year}`;
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const calendarSections = document.querySelectorAll('.weekday-tasks');
    const today = new Date();
    // Find the Monday of the current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    calendarSections.forEach((section, i) => {
        const dayElem = section.querySelector('.day');
        if (dayElem) {
            const dateObj = new Date(monday);
            dateObj.setDate(monday.getDate() + i);
            const dayName = days[dateObj.getDay()];
            const dayNum = String(dateObj.getDate()).padStart(2, '0');
            dayElem.textContent = `${dayName}, ${dayNum}`;

            if (
                dateObj.getDate() === today.getDate() &&
                dateObj.getMonth() === today.getMonth() &&
                dateObj.getFullYear() === today.getFullYear()
            ) {
                dayElem.classList.add('current-day');
            } else {
                dayElem.classList.remove('current-day');
            }
        }
    });

    // Week check and clear
    const weekKey = getCurrentWeekKey();
    const storedWeekKey = localStorage.getItem('smartTasksWeekKey');
    if (storedWeekKey !== weekKey) {
        localStorage.removeItem('smartTasksEntries');
        localStorage.setItem('smartTasksWeekKey', weekKey);
    }

    loadEntries();
});

let selectedTaskItem = null;
let editingEntry = false;

// Highlight selected task-item on click and open modal
document.querySelectorAll('.task-item').forEach(item => {
    item.addEventListener('click', function (e) {
        // Only select if not clicking drag icon or entry
        if (e.target.classList.contains('material-symbols-outlined')) return;
        document.querySelectorAll('.task-item.selected').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        selectedTaskItem = item;

        const entry = item.querySelector('.entry');
        if (entry) {
            showEntryModal(true, entry); // Edit mode
        } else {
            showEntryModal(false); // Create mode
        }
    });
});

// Modal logic
function showEntryModal(isEdit, entry = null) {
    const modal = document.getElementById('entry-modal');
    const form = document.getElementById('entry-form');
    const descInput = form.desc;
    const typeInputs = form.querySelectorAll('input[name="type"]');
    const actions = form.querySelector('.modal-actions');

    // Remove all action buttons
    actions.innerHTML = '';

    if (isEdit && entry) {
        // Edit mode
        editingEntry = true;
        modal.querySelector('h3').textContent = 'Edit Entry';

        // Fill form with entry data
        descInput.value = entry.querySelector('p')?.textContent || '';
        // Set types
        const colorSpans = entry.querySelectorAll('.item-color');
        const types = Array.from(colorSpans).map(span => {
            const cls = Array.from(span.classList).find(c => c.startsWith('item-color-'));
            return cls ? cls.replace('item-color-', '') : '';
        });
        typeInputs.forEach(input => {
            input.checked = types.includes(input.value);
        });

        // Add Update, Remove, Close buttons
        const updateBtn = document.createElement('button');
        updateBtn.type = 'submit';
        updateBtn.className = 'btn-success';
        updateBtn.textContent = 'Update';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn-danger';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = function () {
            if (selectedTaskItem) {
                const oldEntry = selectedTaskItem.querySelector('.entry');
                if (oldEntry) selectedTaskItem.removeChild(oldEntry);
                hideEntryModal();
                saveEntries();
            }
        };

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'btn-danger';
        closeBtn.textContent = 'Close';
        closeBtn.onclick = hideEntryModal;

        actions.appendChild(updateBtn);
        actions.appendChild(removeBtn);
        actions.appendChild(closeBtn);
    } else {
        // Create mode
        editingEntry = false;
        modal.querySelector('h3').textContent = 'Add Entry';
        form.reset();
        // Set default type
        typeInputs.forEach(input => {
            input.checked = input.value === 'task';
        });

        // Add Create, Cancel buttons
        const createBtn = document.createElement('button');
        createBtn.type = 'submit';
        createBtn.className = 'btn-success';
        createBtn.textContent = 'Create';

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn-danger';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = hideEntryModal;

        actions.appendChild(createBtn);
        actions.appendChild(cancelBtn);
    }

    modal.style.display = 'flex';
}

function hideEntryModal() {
    document.getElementById('entry-modal').style.display = 'none';
    if (selectedTaskItem) selectedTaskItem.classList.remove('selected');
    selectedTaskItem = null;
    editingEntry = false;
}

// Handle form submit (Create or Update)
document.getElementById('entry-form').onsubmit = function(e) {
    e.preventDefault();
    if (!selectedTaskItem) return;

    const desc = this.desc.value.trim();
    const types = Array.from(this.querySelectorAll('input[name="type"]:checked')).map(cb => cb.value);

    if (types.length === 0) {
        alert('Please select at least one type.');
        return;
    }

    // Create entry element
    const entry = document.createElement('div');
    entry.className = 'entry';
    let colorSpans = types.map(type => `<span class="item-color item-color-${type}"></span>`).join('');
    entry.innerHTML = `
        <span class="material-symbols-outlined">drag_indicator</span>
        ${colorSpans}
        <p>${desc}</p>
    `;

    // Remove old entry if exists
    const oldEntry = selectedTaskItem.querySelector('.entry');
    if (oldEntry) selectedTaskItem.removeChild(oldEntry);

    selectedTaskItem.appendChild(entry);

    // Make drag icon draggable
    const icon = entry.querySelector('.material-symbols-outlined');
    icon.setAttribute('draggable', 'true');
    icon.addEventListener('dragstart', function (e) {
        draggedEntry = icon.parentElement;
        sourceTaskItem = icon.closest('.task-item');
        e.dataTransfer.effectAllowed = 'move';
    });

    hideEntryModal();
    saveEntries();
};

function saveEntries() {
    const entries = [];
    document.querySelectorAll('.task-item').forEach((item, idx) => {
        const entry = item.querySelector('.entry');
        if (entry) {
            const desc = entry.querySelector('p')?.textContent || '';
            // Collect all types from color classes
            const colorSpan = entry.querySelector('.item-color');
            const typeClasses = Array.from(colorSpan.classList).filter(c => c.startsWith('item-color-'));
            const types = typeClasses.map(c => c.replace('item-color-', ''));
            entries.push({ idx, desc, types });
        }
    });
    localStorage.setItem('smartTasksEntries', JSON.stringify(entries));
}

function loadEntries() {
    const entries = JSON.parse(localStorage.getItem('smartTasksEntries') || '[]');
    document.querySelectorAll('.task-item').forEach((item, idx) => {
        // Remove existing entry
        const oldEntry = item.querySelector('.entry');
        if (oldEntry) item.removeChild(oldEntry);

        // Find entry for this index
        const entryData = entries.find(e => e.idx === idx);
        if (entryData) {
            const entry = document.createElement('div');
            entry.className = 'entry';
            let colorSpans = entryData.types.map(type => `<span class="item-color item-color-${type}"></span>`).join('');
            entry.innerHTML = `
                <span class="material-symbols-outlined">drag_indicator</span>
                ${colorSpans}
                <p>${entryData.desc}</p>
            `;
            item.appendChild(entry);

            // Make drag icon draggable
            const icon = entry.querySelector('.material-symbols-outlined');
            icon.setAttribute('draggable', 'true');
            icon.addEventListener('dragstart', function (e) {
                draggedEntry = icon.parentElement;
                sourceTaskItem = icon.closest('.task-item');
                e.dataTransfer.effectAllowed = 'move';
            });
        }
    });
}

function getCurrentWeekKey() {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - jan1) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + jan1.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${week}`;
}

function toggleThemeMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
}

// Export functionality
document.getElementById('export-btn')?.addEventListener('click', function (e) {
    e.preventDefault();
    const entries = localStorage.getItem('smartTasksEntries') || '[]';
    const blob = new Blob([entries], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'smart-tasks-entries.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});