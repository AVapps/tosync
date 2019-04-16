import { Template } from 'meteor/templating';
import './default.html';
import Utils from '../../api/client/lib/Utils.js';
import _ from 'lodash';

Template.defaultModalContent.helpers({
    showEvent(evt) {
        return evt.tag != 'rotation';
    }
});

Template.defaultModalEvent.helpers({
    tags(evt) {
        switch (evt.tag) {
            case 'simu':
            case 'instructionSimu':
                return ['simu', 'instructionSimu'];
            case 'sol':
            case 'instructionSol':
                return ['sol', 'instructionSol'];
            default:
                if (_.has(Utils.categories, evt.category) && _.get(Utils.categories, evt.category) == evt.tag) {
                    return [ evt.tag ];
                } else {
                    return Utils.tags;
                }
        }
    },

    tagLabel(tag) {
        return Utils.tagLabel(tag);
    },

    isSelected(tag) {
        return this.event.tag === tag ? 'selected' : '';
    }
});

Template.defaultModalEvent.events({
    'change select': function (e, t) {
        const tag = e.currentTarget.value;
        t.$('tr').trigger('set.tosync', { event: this.event, set: { tag }});
    },

    'click .remove-button': function (e,t) {
        t.$('tr').trigger('removeEvent.tosync', this.event._id)
            .fadeOut();
    }
});
