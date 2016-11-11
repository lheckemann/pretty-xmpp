var XMPP = require('stanza.io');
var views = {};
var client;

$(function() {
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
        switchToView(views.login);
        client.disconnect();
    });
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
    $("#heading").text(params.jid);

    client.on('session:started', function() {
        client.sendPresence();
        client.enableCarbons();
        client.getRoster().then(updateRoster, rosterFailed);
        switchToView(views.connected);
    });

    client.on('chat', onMessage);
    client.on('carbon:sent', e => onMessage(e.carbonSent.forwarded.message));

    client.connect();
}

function onMessage(msg) {
    // Might be chat state or similar
    if (!msg.body) return;

    var chatJid;
    if (msg.from.bare != client.jid.bare) {
        chatJid = msg.from.bare;
    }
    else if (msg.to.bare != client.jid.bare) {
        chatJid = msg.to.bare;
    }
    else {
        console.warn("Warning: received message couldn't be associated with a chat");
        console.warn(msg);
        return;
    }

    var messageEl = $('<div/>'),
        authorEl = $('<b/>'),
        bodyEl = $('<span/>');
    messageEl.addClass('message');
    authorEl.addClass('author');
    bodyEl.addClass('body');
    authorEl.text(msg.from);
    bodyEl.text(msg.body);
    messageEl.append(authorEl);
    messageEl.append(bodyEl);
    $(getChatView(chatJid)).append(messageEl);
}

function updateRoster(reply) {
    var rosterView = $('#roster');
    rosterView.empty();
    for (contact of reply.roster.items) {
        contactItem = $('<a>');
        contactItem.addClass('contact');
        contactItem.text(contact.jid.bare);
        contactItem.click(e => switchToChat(e.toElement.innerText));
        views.chatListItems[contact.jid.bare] = contactItem;
        rosterView.append(contactItem);
    }
}

function switchToChat(jid) {
    views.chatListItems.ACTIVE.removeClass("active");
    views.chatListItems.ACTIVE = views.chatListItems[jid];
    views.chatListItems[jid].addClass("active");
    $('#chatBox').empty();
    $('#chatBox').append(getChatView(jid));
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
