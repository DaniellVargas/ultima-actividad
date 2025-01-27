$(function () {
  const FADE_TIME = 150; // ms
  const TYPING_TIMER_LENGTH = 400; // ms
  const COLORS = [
    "#e21400",
    "#91580f",
    "#f8a700",
    "#f78b00",
    "#58dc00",
    "#287b00",
    "#a8f07a",
    "#4ae8c4",
    "#3b88eb",
    "#3824aa",
    "#a700ff",
    "#d300e7",
  ];

  const $window = $(window);
  const $usernameInput = $(".usernameInput"); // Input for username
  const $messages = $(".messages"); // Messages area
  const $inputMessage = $(".inputMessage"); // Input message input box

  const $loginPage = $(".login.page"); // The login page
  const $chatPage = $(".chat.page"); // The chatroom page

  const socket = io();

  let username;
  let connected = false;
  let typing = false;
  let lastTypingTime;
  let $currentInput = $usernameInput.focus();

  const addParticipantsMessage = (data) => {
    let message = "";
    if (data.numUsers === 1) {
      message += `un participante conectado`;
    } else {
      message += `there are ${data.numUsers} participants`;
    }
    log(message);
  };

  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off("click");
      $currentInput = $inputMessage.focus();

      socket.emit("add user", username);
    }
  };

  // Sends a chat message
  const sendMessage = () => {
    let message = $inputMessage.val();
    message = cleanInput(message);
    if (message && connected) {
      $inputMessage.val("");
      addChatMessage({ username, message });
      // tell server to execute 'new message' and send along one parameter
      socket.emit("new message", message);
    }
  };

  // Log a message
  const log = (message, options) => {
    const $el = $("<li>").addClass("log").text(message);
    addMessageElement($el, options);
  };

  const addChatMessage = (data, options = {}) => {
    // Don't fade the message in if there is an 'X was typing'
    const $typingMessages = getTypingMessages(data);
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    const $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css("color", getUsernameColor(data.username));
    const $messageBodyDiv = $('<span class="messageBody">').text(data.message);

    const typingClass = data.typing ? "typing" : "";
    const $messageDiv = $('<li class="message"/>')
      .data("username", data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  };

  const addChatTyping = (data) => {
    data.typing = true;
    data.message = "is typing";
    addChatMessage(data);
  };

  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  };

  const addMessageElement = (el, options) => {
    const $el = $(el);
    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === "undefined") {
      options.fade = true;
    }
    if (typeof options.prepend === "undefined") {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }

    $messages[0].scrollTop = $messages[0].scrollHeight;
  };

  const cleanInput = (input) => {
    return $("<div/>").text(input).html();
  };

  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit("typing");
      }
      lastTypingTime = new Date().getTime();

      setTimeout(() => {
        const typingTimer = new Date().getTime();
        const timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit("stop typing");
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  };

  const getTypingMessages = (data) => {
    return $(".typing.message").filter(function (i) {
      return $(this).data("username") === data.username;
    });
  };

  const getUsernameColor = (username) => {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    const index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  };

  // eventos del teclado

  $window.keydown((event) => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit("stop typing");
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on("input", () => {
    updateTyping();
  });

  // Click events

  $loginPage.click(() => {
    $currentInput.focus();
  });

  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  socket.on("login", (data) => {
    connected = true;
    // ventana de chat
    const message = "Bienvenido a Socket.IO Chat – ";
    log(message, {
      prepend: true,
    });
    addParticipantsMessage(data);
  });

  socket.on("new message", (data) => {
    addChatMessage(data);
  });

  socket.on("user joined", (data) => {
    log(`${data.username} joined`);
    addParticipantsMessage(data);
  });

  socket.on("user left", (data) => {
    log(`${data.username} left`);
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  socket.on("typing", (data) => {
    addChatTyping(data);
  });

  socket.on("stop typing", (data) => {
    removeChatTyping(data);
  });

  socket.on("disconnect", () => {
    log("you have been disconnected");
  });

  socket.on("reconnect", () => {
    log("you have been reconnected");
    if (username) {
      socket.emit("add user", username);
    }
  });

  socket.on("reconnect_error", () => {
    log("attempt to reconnect has failed");
  });
});
