// To parse this data:
//
//   import { Convert } from "./file";
//
//   const thread = Convert.toThread(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

// Interface to mark everything that has an html url
export interface HtmlAccessible {
    html_url: string;
}

// Notification Thread
export interface Thread {
    id: string;
    last_read_at: string | null;
    reason: string;
    repository: Repository;
    subject: Subject;
    unread: boolean;
    updated_at: Date;
    url: string;
}

// The subject of a notification
export interface Subject {
    type: string;
    title: string;
    url: string;
}

// Repository info
export interface Repository extends HtmlAccessible {
    id: number;
    node_id: string;
    name: string;
    owner: User;
}

// A GitHub User
export interface User {
    id: number;
    node_id: string;
    login: string;
    name?: string | null;
    email?: string | null;
    avatar_url: string;
}

export interface MarkNotificationsArReadRequest {
    last_read_at: string;
    read: boolean;
}

export interface BasicError {
    message?: string;
    status?: string;
    url?: string;
    documentation_url?: string;
}

export interface ValidationError {
    errors?: string[];
    message: string;
    documentation_url?: string;
}
