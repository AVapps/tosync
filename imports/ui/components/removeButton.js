import { Template } from 'meteor/templating';
import './removeButton.html';

Template.removeButton.onCreated(function() {
	this.active = new ReactiveVar(false);
});

Template.removeButton.events({
	'click button.remove-button': function (e,t) {
        if (t.active.get()) {
            // TODO TRIGGER
            t.active.set(false);
        } else {
            t.active.set(true);
        }
    }
});

Template.removeButton.helpers({
	isActive() {
        return Template.instance().active.get();
    },

    buttonClass() {
        return Template.instance().active.get() ? "active btn-danger" : "btn-link";
    }
});
