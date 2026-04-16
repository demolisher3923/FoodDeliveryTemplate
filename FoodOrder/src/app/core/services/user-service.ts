import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment.development';
import { AdminUserListItem, UpdateUserProfileRequest, UserProfile } from '../../models/user.model';
import { PaginationRequest, PaginationResponse } from '../../models/pagination.model';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);

  getMe() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/User/me`);
  }

  updateMe(request: UpdateUserProfileRequest) {
    const formData = new FormData();

    formData.append('fullName', request.fullName);
    formData.append('mobileNumber', request.mobileNumber);
    formData.append('address', request.address);
    formData.append('gender', request.gender);
    formData.append('preferredContactMethod', request.preferredContactMethod);
    formData.append('profileUrl', request.profileUrl ?? '');

    request.interests.forEach((interest, index) => formData.append(`interests[${index}]`, interest));

    if (request.profileImage) {
      formData.append('profileImage', request.profileImage);
    }

    return this.http.put<UserProfile>(`${environment.apiUrl}/User/me`, formData);
  }

  getUsers(request: PaginationRequest) {
    let params = new HttpParams()
      .set('pageNumber', request.pageNumber)
      .set('pageSize', request.pageSize)
      .set('sortBy', request.sortBy ?? 'createdAt')
      .set('sortDirection', request.sortDirection ?? 'desc');

    if (request.search?.trim()) {
      params = params.set('search', request.search.trim());
    }

    return this.http.get<PaginationResponse<AdminUserListItem>>(`${environment.apiUrl}/User`, { params });
  }
}
