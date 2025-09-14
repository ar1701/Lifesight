document.addEventListener("DOMContentLoaded", () => {
  const previewModalEl = document.getElementById("preview-modal");
  const previewModal = new bootstrap.Modal(previewModalEl);
  const previewContent = document.getElementById("preview-content");
  const fileList = document.getElementById("files");
  const sendPromptBtn = document.getElementById("send-prompt");
  const promptInput = document.getElementById("prompt-input");
  const chatBox = document.getElementById("chat-box");
  const dashboardWidgets = document.getElementById("dashboard-widgets");

  let selectedFileId = null;
  let selectedDashboardId = null;

  // --- Initial Load ---
  function loadDashboardWidgets() {
    if (window.savedWidgets && window.savedWidgets.length > 0) {
      const widgetsData = window.savedWidgets;
      widgetsData.forEach((widget) => {
        renderWidgetOnDashboard(widget);
      });
    }
  }

  // --- File Actions Logic ---
  fileList.addEventListener("click", (event) => {
    // Handle clicks on icons inside buttons
    let target = event.target;
    if (target.tagName === "I") {
      target = target.closest("button");
    }

    if (!target || target.tagName !== "BUTTON") {
      return;
    }

    const parentItem = target.closest(".file-list-item");
    const fileId = parentItem.dataset.fileId;

    if (target.classList.contains("preview-btn")) {
      fetchAndShowPreview(fileId, 1);
    }

    if (target.classList.contains("select-btn")) {
      document
        .querySelectorAll(".file-list-item")
        .forEach((li) => li.classList.remove("selected"));
      parentItem.classList.add("selected");
      selectedFileId = fileId;
      promptInput.placeholder = `Ask about ${parentItem
        .querySelector(".file-name")
        .textContent.trim()}...`;
    }

    if (target.classList.contains("delete-file-btn")) {
      deleteFile(fileId, parentItem);
    }
  });

  function fetchAndShowPreview(fileId, page) {
    fetch(`/app/preview/${fileId}?page=${page}`)
      .then((response) => response.json())
      .then((response) => {
        if (response.error) throw new Error(response.error);
        previewContent.innerHTML = generatePaginatedTable(fileId, response);
        previewModal.show();
      })
      .catch((error) => {
        console.error("Error fetching preview:", error);
        previewContent.innerHTML = `<p class="text-danger">Error loading preview.</p>`;
        previewModal.show();
      });
  }

  previewModalEl.addEventListener("click", (event) => {
    if (event.target.matches(".page-link")) {
      event.preventDefault();
      const fileId = event.target.dataset.fileId;
      const page = event.target.dataset.page;
      if (fileId && page) {
        fetchAndShowPreview(fileId, page);
      }
    }
  });

  // --- Gemini Prompt Logic ---
  sendPromptBtn.addEventListener("click", handlePromptSubmission);
  promptInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handlePromptSubmission();
  });

  async function handlePromptSubmission() {
    const prompt = promptInput.value;
    if (!prompt) {
      alert("Please enter a prompt.");
      return;
    }
    if (!selectedFileId) {
      alert("Please select a file first.");
      return;
    }

    appendMessage("user", prompt);
    appendMessage("assistant", "Generating insight, please wait...", true);
    promptInput.value = "";

    try {
      const response = await fetch("/app/generate-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, fileId: selectedFileId }),
      });

      const aiResponse = await response.json();
      const loadingMessage = chatBox.querySelector(".loading-message");
      if (loadingMessage) {
        loadingMessage.remove();
      }

      if (aiResponse.type === "error") {
        appendMessage(
          "assistant",
          `Sorry, an error occurred: ${aiResponse.message}`
        );
      } else {
        console.log("AI Response received:", aiResponse);
        createWidgetInChat(aiResponse);
      }
    } catch (error) {
      console.error("Error generating insight:", error);
      const loadingMessage = chatBox.querySelector(".loading-message");
      if (loadingMessage) {
        loadingMessage.remove();
      }
      appendMessage(
        "assistant",
        "An error occurred while communicating with the AI."
      );
    }
  }

  function createWidgetInChat(aiResponse) {
    try {
      const widgetWrapper = document.createElement("div");
      widgetWrapper.className = "widget-container";

      const content = generateWidgetContent(aiResponse);
      widgetWrapper.innerHTML = content;

      const addToDashboardBtn = document.createElement("button");
      addToDashboardBtn.className = "btn btn-sm btn-success mt-2";
      addToDashboardBtn.innerHTML =
        '<i class="bi bi-plus-lg"></i> Add to Dashboard';
      addToDashboardBtn.onclick = () => {
        saveWidgetToDashboard(aiResponse, addToDashboardBtn);
      };

      widgetWrapper.appendChild(addToDashboardBtn);
      chatBox.appendChild(widgetWrapper);

      if (aiResponse.type === "chart" && aiResponse.config) {
        const canvas = widgetWrapper.querySelector("canvas");
        if (canvas) {
          new Chart(canvas.getContext("2d"), aiResponse.config);
        }
      }
      chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
      console.error("Error creating widget in chat:", error);
      appendMessage(
        "assistant",
        "Error displaying the generated content. Please try again."
      );
    }
  }

  async function saveWidgetToDashboard(aiResponse, button) {
    try {
      if (!selectedDashboardId) {
        alert("Please select a dashboard first");
        return;
      }

      console.log("Saving widget to dashboard:", aiResponse);
      const widgetData = {
        ...aiResponse,
        dashboardId: selectedDashboardId,
      };

      const response = await fetch("/api/widgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(widgetData),
      });
      const newWidget = await response.json();
      console.log("Widget save response:", newWidget);
      if (response.ok) {
        renderWidgetOnDashboard(newWidget);
        button.textContent = "Added!";
        button.disabled = true;
      } else {
        throw new Error(newWidget.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error saving widget:", error);
      button.textContent = "Error!";
    }
  }

  function renderWidgetOnDashboard(widget) {
    const noWidgetsMsg = document.getElementById("no-widgets-message");
    if (noWidgetsMsg) noWidgetsMsg.remove();

    const container = document.createElement("div");
    container.className = "col-md-6";
    dashboardWidgets.appendChild(container);

    const widgetWrapper = document.createElement("div");
    widgetWrapper.className = "widget-container";
    widgetWrapper.setAttribute("data-widget-id", widget._id);
    container.appendChild(widgetWrapper);

    // Create header with delete button
    const header = document.createElement("div");
    header.className =
      "card-header d-flex justify-content-between align-items-center";
    header.innerHTML = `
      <span class="fw-bold">
        ${
          widget.type === "chart"
            ? '<i class="bi bi-bar-chart-line me-2"></i>Chart'
            : '<i class="bi bi-table me-2"></i>Table'
        }
      </span>
      <button type="button" class="btn btn-sm btn-outline-danger delete-widget-btn" title="Delete Widget">
        <i class="bi bi-trash"></i>
      </button>
    `;
    widgetWrapper.appendChild(header);

    // Create body with content
    const body = document.createElement("div");
    body.className = "card-body";
    const content = generateWidgetContent(widget);
    body.innerHTML = content;
    widgetWrapper.appendChild(body);

    if (widget.type === "chart") {
      new Chart(body.querySelector("canvas").getContext("2d"), widget.config);
    }
  }

  function generateWidgetContent(widget) {
    try {
      if (!widget || !widget.type) {
        return "<p>Invalid widget data.</p>";
      }

      if (widget.type === "chart") {
        return `<canvas></canvas>`;
      } else if (widget.type === "table") {
        return generateTable(widget.data, false);
      }
      return "<p>Unsupported widget type.</p>";
    } catch (error) {
      console.error("Error generating widget content:", error);
      return "<p>Error generating widget content.</p>";
    }
  }

  function appendMessage(sender, text, isLoading = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}-message`;
    if (isLoading) messageDiv.classList.add("loading-message");

    const avatar = `<div class="avatar">${sender === "user" ? "U" : "A"}</div>`;
    const textDiv = `<div class="text">${text}</div>`;

    messageDiv.innerHTML = avatar + textDiv;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function generateTable(data, isPreview) {
    // Handle undefined or null data
    if (!data) {
      return "<p>No data available to display.</p>";
    }

    let headers, rows;

    if (isPreview) {
      // For preview data (from file preview)
      if (Array.isArray(data[0])) {
        headers = data[0];
        rows = data.slice(1);
      } else {
        headers = Object.keys(data[0] || {});
        rows = data;
      }
    } else {
      // For widget data (from AI response)
      if (data.data && data.data.headers && data.data.rows) {
        headers = data.data.headers;
        rows = data.data.rows;
      } else if (data.headers && data.rows) {
        headers = data.headers;
        rows = data.rows;
      } else {
        return "<p>Invalid table data structure.</p>";
      }
    }

    if (!headers || !rows || headers.length === 0 || rows.length === 0) {
      return "<p>No data to display.</p>";
    }

    let table =
      '<div class="table-responsive"><table class="table table-striped table-hover"><thead><tr>';
    headers.forEach((header) => (table += `<th>${header}</th>`));
    table += "</tr></thead><tbody>";
    rows.forEach((row) => {
      table += "<tr>";
      const rowData = isPreview
        ? Array.isArray(row)
          ? row
          : headers.map((h) => row[h] || "")
        : row;
      rowData.forEach((cell) => (table += `<td>${cell}</td>`));
      table += "</tr>";
    });
    table += "</tbody></table></div>";
    return table;
  }

  function generatePaginatedTable(fileId, response) {
    const { data, currentPage, totalPages, totalRows } = response;
    let tableHtml = generateTable(data, true);

    let paginationHtml = `<nav class="mt-3"><ul class="pagination justify-content-center">`;
    if (currentPage > 1) {
      paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${
        currentPage - 1
      }" data-file-id="${fileId}">Previous</a></li>`;
    }
    paginationHtml += `<li class="page-item disabled"><span class="page-link">Page ${currentPage} of ${totalPages}</span></li>`;
    if (currentPage < totalPages) {
      paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${
        currentPage + 1
      }" data-file-id="${fileId}">Next</a></li>`;
    }
    paginationHtml += `</ul></nav>`;

    return tableHtml + paginationHtml;
  }

  // --- Delete Functions ---
  async function deleteFile(fileId, fileElement) {
    if (
      !confirm(
        "Are you sure you want to delete this file? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/app/file/${fileId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        fileElement.remove();
        // If this was the selected file, clear selection
        if (selectedFileId === fileId) {
          selectedFileId = null;
          promptInput.placeholder = "Select a file and ask a question...";
        }
        // Show success message
        appendMessage("assistant", "File deleted successfully.");
      } else {
        throw new Error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      appendMessage("assistant", `Error deleting file: ${error.message}`);
    }
  }

  // Add event listener for widget delete buttons
  document.addEventListener("click", (event) => {
    if (event.target.closest(".delete-widget-btn")) {
      const widgetContainer = event.target.closest(".widget-container");
      const widgetId = widgetContainer.dataset.widgetId;
      deleteWidget(widgetId, widgetContainer);
    }
  });

  async function deleteWidget(widgetId, widgetElement) {
    if (
      !confirm(
        "Are you sure you want to delete this widget? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/widgets/${widgetId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok) {
        // Remove the entire column div (parent of widget-container)
        const columnDiv = widgetElement.closest(".col-md-6");
        columnDiv.remove();

        // Check if no widgets remain
        const remainingWidgets = document.querySelectorAll(".widget-container");
        if (remainingWidgets.length === 0) {
          const dashboardWidgets = document.getElementById("dashboard-widgets");
          dashboardWidgets.innerHTML =
            '<p id="no-widgets-message" class="text-center text-muted">Your dashboard is empty. Generate a chart or table in the chat and add it here.</p>';
        }

        appendMessage("assistant", "Widget deleted successfully.");
      } else {
        throw new Error(result.error || "Failed to delete widget");
      }
    } catch (error) {
      console.error("Error deleting widget:", error);
      appendMessage("assistant", `Error deleting widget: ${error.message}`);
    }
  }

  // --- Dashboard Management ---
  function initializeDashboardSelection() {
    const dashboardSelect = document.getElementById("dashboardSelect");
    if (dashboardSelect && dashboardSelect.options.length > 0) {
      selectedDashboardId = dashboardSelect.value;
    }
  }

  // Create new dashboard
  async function createDashboard() {
    const name = document.getElementById("dashboardName").value.trim();
    const description = document
      .getElementById("dashboardDescription")
      .value.trim();

    if (!name) {
      alert("Please enter a dashboard name");
      return;
    }

    try {
      const response = await fetch("/api/dashboards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });

      const result = await response.json();

      if (response.ok) {
        // Add new dashboard to select dropdown
        const dashboardSelect = document.getElementById("dashboardSelect");
        const option = document.createElement("option");
        option.value = result._id;
        option.textContent = result.name;
        dashboardSelect.appendChild(option);
        dashboardSelect.value = result._id;
        selectedDashboardId = result._id;

        // Close modal and reset form
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("createDashboardModal")
        );
        modal.hide();
        document.getElementById("createDashboardForm").reset();

        appendMessage(
          "assistant",
          `Dashboard "${result.name}" created successfully!`
        );
      } else {
        throw new Error(result.error || "Failed to create dashboard");
      }
    } catch (error) {
      console.error("Error creating dashboard:", error);
      appendMessage("assistant", `Error creating dashboard: ${error.message}`);
    }
  }

  // Update selected dashboard
  function updateSelectedDashboard() {
    const dashboardSelect = document.getElementById("dashboardSelect");
    selectedDashboardId = dashboardSelect.value;
  }

  // Event listeners for dashboard management
  document
    .getElementById("createDashboardBtn")
    .addEventListener("click", createDashboard);
  document
    .getElementById("dashboardSelect")
    .addEventListener("change", updateSelectedDashboard);

  // --- Initializations ---
  loadDashboardWidgets();
  initializeDashboardSelection();
});
