var XMPP = require('stanza.io');
var views = {};
var client;

$(function() {
    views.login = $('#loginView');
    views.progress = $('#progressView');
    views.connected = $('#connectedView');

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
        jid: new XMPP.JID($('#loginJid').val()),
        password: $('#loginPw').val()
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
        switchToView(views.connected);
    });

    client.on('chat', function(msg) {
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
        $('#chatBox').append(messageEl);
    });
    client.connect();
}
