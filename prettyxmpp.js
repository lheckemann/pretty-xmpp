var XMPP = require('stanza.io');
var views = {};
var client;
var windowVisible = true;

$(function() {
    window.XMPP = XMPP;
    window.views = views;
    views.login = $('#loginView');
    views.progress = $('#progressView');
    views.connected = $('#connectedView');
    views.chats = {};
    views.chatListItems = {
        ACTIVE: $('<div>') // Dummy
    };

    var loginButton = $('#loginButton');
    loginButton.val('Log in');
    loginButton.attr('disabled', null);

    if (localStorage.loginDetails) {
        connect(JSON.parse(localStorage.loginDetails));
    }

    $('#loginForm').submit(function(e) {
        e.preventDefault();
        var params = validateLoginForm();
        if (params) {
            connect(params);
        }
    });

    $('#logout').click(function(e) {
        localStorage.clear();
        $('#passwordCleared').show();
        $('#loginJid').val('');
        $('#loginPw').val('');
        switchToView(views.login);
        client.disconnect();
    });

    $('#messageInput').on('keypress', function(e) {
        if (e.key == 'Enter') {
            if (e.shiftKey) {
                $('#messageInput').val($('#messageInput').val() + '\n');
            } else {
                sendMessage();
            }
        }
    });
    $('#sendButton').on('click', function(e) {
        e.preventDefault();
        sendMessage();
    });


    $(window).on("focus", function() {
        windowVisible = true;
    });
    $(window).on("blur", function() {
        windowVisible = false;
    });

    if (!"Notification" in window) {
        window.Notification = () => null;
    }
    else {
        Notification.requestPermission(() => null);
    }
});

function switchToView(switchTo) {
    $('.mainView').hide();
    switchTo.show();
}

function validateLoginForm() {
    var params = {
        jid: new XMPP.JID($('#loginJid').val()).bare,
        password: $('#loginPw').val(),
        useStreamManagement: true
    };

    if ($('#loginSave').prop('checked')) {
        localStorage.loginDetails = JSON.stringify(params);
    }

    return params;
}

function connect(params) {
    switchToView(views.progress);
    client = XMPP.createClient(params);
    window.client = client;
    $("#heading").text(params.jid);

    client.on('session:started', function() {
        client.sendPresence();
        client.enableCarbons();
        client.getRoster().then(updateRoster, rosterFailed);
        switchToView(views.connected);
    });

    client.on('chat', onMessage);
    client.on('message:sent', onMessage);

    client.connect();
}

function onMessage(msg) {
    // Might be chat state or similar
    if (!msg.body) return;

    var chatJid;
    var direction;
    if (msg.from.bare != client.jid.bare) {
        chatJid = msg.from.bare;
        direction = "incoming";
    }
    else if (msg.to.bare != client.jid.bare) {
        chatJid = msg.to.bare;
        direction = "outgoing";
    }
    else {
        console.warn("Warning: received message couldn't be associated with a chat");
        console.warn(msg);
        return;
    }

    var messageEl = $('<div/>'),
        authorEl = $('<b/>'),
        bodyEl = $('<span/>');
    messageEl.addClass('message ' + direction);
    authorEl.addClass('author');
    bodyEl.addClass('body');
    authorEl.text(msg.from.bare);
    bodyEl.text(msg.body);
    messageEl.append(authorEl);
    messageEl.append(bodyEl);
    $(getChatView(chatJid)).append(messageEl);
    $(getChatView(chatJid)).scrollTop(999999);

    increaseUnreadCount(chatJid);
    if (!windowVisible) {
        var n = new Notification("Message from " + chatJid, {
            body: msg.body
        });
        n.onclick = () => switchToChat(chatJid);
    }
    ($('#newMessageSound')[0] || {play: ()=>null}).play();
}

function increaseUnreadCount(jid) {
    var chatTab = getChatTabElement(jid);
    if (chatTab != views.chatListItems.ACTIVE) {
        var unreadCount = chatTab.children('.unreadCount').first();
        var count = 0;
        if (unreadCount[0]) {
            count = parseInt(unreadCount.text()) || 0;
        }
        else {
            unreadCount = $('<span/>');
            unreadCount.addClass('unreadCount');
            chatTab.append(unreadCount);
        }
        count++;
        unreadCount.text(count);
    }
}

function updateRoster(reply) {
    var rosterView = $('#roster');
    rosterView.empty();
    for (contact of reply.roster.items) {
        getChatTabElement(contact.jid).addClass('contact');
    }
}

function switchToChat(jid) {
    old = views.chatListItems.ACTIVE;
    if (old) {
        old.removeClass("active");
    }
    newActive = getChatTabElement(jid);
    views.chatListItems.ACTIVE = newActive;
    newActive.addClass("active");
    newActive.children('.unreadCount').remove();
    $('#chatBox').empty();
    $('#chatBox').append(getChatView(jid));
    $(getChatView(jid)).scrollTop(999999);
    $('#messageInput').focus();
}

function rosterFailed() {
    var roster = $('#roster');
    roster.empty();
    roster.append($('<div class="rosterError">Could not get roster</div>'));
}


function getChatView(jid) {
    var view = views.chats[jid];
    if (!view) {
        view = $('<div>');
        view.addClass('chat');
        views.chats[jid] = view;
    }
    return view;
}

function sendMessage() {
    var content = $('#messageInput').val();
    var recipient = new XMPP.JID(views.chatListItems.ACTIVE.attr('data-jid'));
    if (content && recipient) {
        $('#messageInput').val('');
        client.sendMessage({
            to: recipient,
            from: client.jid,
            body: content,
            type: 'chat'
        });
    }
}

function getChatTabElement(jid) {
    jid = jid.bare || jid;
    var el = views.chatListItems[jid];
    if (el) {
        return el;
    }
    el = $('<a>');
    el.attr('data-jid', jid);
    el.addClass('contact');
    el.text(jid);
    el.click(function(e) {
        e.preventDefault();
        switchToChat(this.attributes['data-jid'].value);
    });
    views.chatListItems[jid] = el;
    $('#roster').append(el);
    return el;
}
