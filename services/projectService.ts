import fs from 'fs';
import path from 'path';
import { Project, ProjectJoinRequest, User } from '@/types';

const projectsFilePath = path.join(process.cwd(), 'data', 'projects.json');
const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

export class ProjectService {
  private static readProjects(): Project[] {
    try {
      const fileContent = fs.readFileSync(projectsFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading projects file:', error);
      return [];
    }
  }

  private static writeProjects(projects: Project[]): boolean {
    try {
      fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));
      return true;
    } catch (error) {
      console.error('Error writing projects file:', error);
      return false;
    }
  }

  private static getUsers(): User[] {
    try {
      const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading users file:', error);
      return [];
    }
  }

  static getAllProjects(): Project[] {
    return this.readProjects();
  }

  static getProject(projectId: string): Project | null {
    const projects = this.readProjects();
    return projects.find(p => p.projectId === projectId) || null;
  }

  static getUserProjects(userId: string): Project[] {
    const projects = this.readProjects();
    return projects.filter(project =>
      project.ownerId === userId ||
      project.members.some(member => member.id === userId)
    );
  }

  static getPublicProjects(): Project[] {
    const projects = this.readProjects();
    return projects.filter(project => project.isPublic);
  }

  static createProject(projectData: Partial<Project>, ownerId: string): Project | null {
    const projects = this.readProjects();
    const users = this.getUsers();
    const owner = users.find(u => u.id === ownerId);

    if (!owner) {
      return null;
    }

    const newProject: Project = {
      projectId: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: projectData.name || 'Untitled Project',
      description: projectData.description,
      ownerId,
      members: [owner],
      createdAt: new Date(),
      updatedAt: new Date(),
      color: projectData.color || '#3B82F6',
      isPublic: projectData.isPublic || false,
      pendingRequests: []
    };

    projects.push(newProject);
    this.writeProjects(projects);

    return newProject;
  }

  static updateProject(projectId: string, updates: Partial<Project>): Project | null {
    const projects = this.readProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return null;
    }

    projects[projectIndex] = {
      ...projects[projectIndex],
      ...updates,
      updatedAt: new Date()
    } as Project;

    this.writeProjects(projects);
    return projects[projectIndex];
  }

  static deleteProject(projectId: string): boolean {
    const projects = this.readProjects();
    const projectIndex = projects.findIndex(p => p.projectId === projectId);

    if (projectIndex === -1) {
      return false;
    }

    projects.splice(projectIndex, 1);
    return this.writeProjects(projects);
  }

  static requestJoinProject(projectId: string, userId: string, message?: string): ProjectJoinRequest | null {
    const projects = this.readProjects();
    const users = this.getUsers();
    const project = projects.find(p => p.projectId === projectId);
    const user = users.find(u => u.id === userId);

    if (!project || !user) {
      return null;
    }

    // Check if user is already a member
    if (project.members.some(m => m.id === userId)) {
      return null;
    }

    // Check if request already exists
    if (project.pendingRequests.some(r => r.userId === userId && r.status === 'pending')) {
      return null;
    }

    const request: ProjectJoinRequest = {
      id: `req_${Date.now()}`,
      userId,
      user,
      projectId,
      message,
      status: 'pending',
      createdAt: new Date()
    };

    project.pendingRequests.push(request);
    this.writeProjects(projects);

    return request;
  }

  static handleJoinRequest(projectId: string, requestId: string, action: 'approve' | 'reject'): boolean {
    const projects = this.readProjects();
    const project = projects.find(p => p.projectId === projectId);

    if (!project) {
      return false;
    }

    const requestIndex = project.pendingRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
      return false;
    }

    const request = project.pendingRequests[requestIndex];
    if (!request) return false;

    if (action === 'approve') {
      // Add user to project members
      const users = this.getUsers();
      const user = users.find(u => u.id === request.userId);
      if (user && !project.members.some(m => m.id === user.id)) {
        project.members.push(user);
      }
    }

    // Update request status
    request.status = action === 'approve' ? 'approved' : 'rejected';

    // Remove from pending requests
    project.pendingRequests.splice(requestIndex, 1);

    return this.writeProjects(projects);
  }

  static removeMember(projectId: string, userId: string): boolean {
    const projects = this.readProjects();
    const project = projects.find(p => p.projectId === projectId);

    if (!project) {
      return false;
    }

    const memberIndex = project.members.findIndex(m => m.id === userId);
    if (memberIndex === -1) {
      return false;
    }

    project.members.splice(memberIndex, 1);
    return this.writeProjects(projects);
  }
}