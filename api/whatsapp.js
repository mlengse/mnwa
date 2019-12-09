"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var exposed_enum_1 = require("./functions/exposed.enum");
var Whatsapp = /** @class */ (function () {
    function Whatsapp(page) {
        this.page = page;
        this.page = page;
    }
    /**
     * Listens to messages received
     * @returns Observable stream of messages
     */
    Whatsapp.prototype.onMessage = function (fn) {
        this.page.exposeFunction(exposed_enum_1.ExposedFn.OnMessage, function (message) {
            return fn(message);
        });
    };
    /**
     * Sends a text message to given chat
     * @param to chat id: xxxxx@us.c
     * @param content text message
     */
    Whatsapp.prototype.sendTextToID = function (to, content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.page.evaluate(function (_a) {
                            var to = _a.to, content = _a.content;
                            // WAPI.sendSeen(to);
                            WAPI.sendMessageToID(to, content);
                        }, { to: to, content: content })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Sends a text message to given chat
     * @param to chat id: xxxxx@us.c
     * @param content text message
     */
    Whatsapp.prototype.sendText = function (to, content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.page.evaluate(function (_a) {
                            var to = _a.to, content = _a.content;
                            WAPI.sendSeen(to);
                            WAPI.sendMessage(to, content);
                        }, { to: to, content: content })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Sends contact card to given chat id
     * @param {string} to 'xxxx@c.us'
     * @param {string|array} contact 'xxxx@c.us' | ['xxxx@c.us', 'yyyy@c.us', ...]
     */
    Whatsapp.prototype.sendContact = function (to, contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.page.evaluate(function (_a) {
                            var to = _a.to, contactId = _a.contactId;
                            return WAPI.sendContact(to, contactId);
                        }, { to: to, contactId: contactId })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Retrieves all contacts
     * @returns array of [Contact]
     */
    Whatsapp.prototype.getAllContacts = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.page.evaluate(function () { return WAPI.getAllContacts(); })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Retrieves all chats
     * @returns array of [Chat]
     */
    Whatsapp.prototype.getAllChats = function (withNewMessageOnly) {
        if (withNewMessageOnly === void 0) { withNewMessageOnly = false; }
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!withNewMessageOnly) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.page.evaluate(function () { return WAPI.getAllChatsWithNewMsg(); })];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, this.page.evaluate(function () { return WAPI.getAllChats(); })];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Retrieve all groups
     * @returns array of groups
     */
    Whatsapp.prototype.getAllGroups = function (withNewMessagesOnly) {
        if (withNewMessagesOnly === void 0) { withNewMessagesOnly = false; }
        return __awaiter(this, void 0, void 0, function () {
            var chats, chats;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!withNewMessagesOnly) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.page.evaluate(function () { return WAPI.getAllChatsWithNewMsg(); })];
                    case 1:
                        chats = _a.sent();
                        return [2 /*return*/, chats.filter(function (chat) { return chat.isGroup; })];
                    case 2: return [4 /*yield*/, this.page.evaluate(function () { return WAPI.getAllChats(); })];
                    case 3:
                        chats = _a.sent();
                        return [2 /*return*/, chats.filter(function (chat) { return chat.isGroup; })];
                }
            });
        });
    };
    /**
     * Retrieves group members as [Id] objects
     * @param groupId group id
     */
    Whatsapp.prototype.getGroupMembersId = function (groupId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.page.evaluate(function (groupId) { return WAPI.getGroupParticipantIDs(groupId); }, groupId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Returns group members [Contact] objects
     * @param groupId
     */
    Whatsapp.prototype.getGroupMembers = function (groupId) {
        return __awaiter(this, void 0, void 0, function () {
            var membersIds, actions;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getGroupMembersId(groupId)];
                    case 1:
                        membersIds = _a.sent();
                        actions = membersIds.map(function (memberId) {
                            return _this.getContact(memberId._serialized);
                        });
                        return [4 /*yield*/, Promise.all(actions)];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Retrieves contact detail object of given contact id
     * @param contactId
     * @returns contact detial as promise
     */
    Whatsapp.prototype.getContact = function (contactId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.page.evaluate(function (contactId) { return WAPI.getContact(contactId); }, contactId)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return Whatsapp;
}());
exports.Whatsapp = Whatsapp;
