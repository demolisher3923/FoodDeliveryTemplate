import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { UserService } from '../../../core/services/user-service';
import { AuthService } from '../../../core/services/auth-service';
import { environment } from '../../../../environments/environment.development';
import { ToastService } from '../../../core/services/toast-service';

@Component({
  selector: 'app-profile',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);

  readonly interestsList = ['Fast Food', 'Chinese', 'Indian', 'Healthy'];

  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  imageError = '';
  selectedProfileImage: File | null = null;
  profileImagePreview: string | null = null;

  readonly form = this.fb.group({
    fullName: ['', [Validators.required]],
    mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    address: ['', [Validators.required, Validators.minLength(8)]],
    gender: ['', [Validators.required]],
    interests: this.fb.array(this.interestsList.map(() => this.fb.control(false))),
    preferredContactMethod: ['Email', [Validators.required]],
    profileUrl: [''],
  });

  constructor() {
    this.loadProfile();
  }

  get interestsControls() {
    return this.form.get('interests') as FormArray;
  }

  get hasSelectedInterest(): boolean {
    return this.interestsControls.controls.some((control) => !!control.value);
  }

  onProfileImageChange(event: Event) {
    const input = event?.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.imageError = '';
    this.selectedProfileImage = null;

    if (!file) {
      return;
    }

    const isValidType = ['image/png', 'image/jpeg'].includes(file.type);
    if (!isValidType) {
      this.imageError = 'Only jpg and png files allowed.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image must be less than 5MB.';
      return;
    }

    this.selectedProfileImage = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.profileImagePreview = typeof reader.result === 'string' ? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  submit() {
    if (this.form.invalid || !this.hasSelectedInterest || !!this.imageError || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const selectedInterests = this.interestsControls.controls
      .map((control, index) => (control.value ? this.interestsList[index] : null))
      .filter((item): item is string => !!item);

    const value = this.form.getRawValue();
    this.userService
      .updateMe({
        fullName: value.fullName ?? '',
        mobileNumber: value.mobileNumber ?? '',
        address: value.address ?? '',
        gender: value.gender ?? '',
        preferredContactMethod: value.preferredContactMethod ?? '',
        interests: selectedInterests,
        profileUrl: value.profileUrl ?? '',
        profileImage: this.selectedProfileImage,
      })
      .subscribe({
        next: (profile) => {
          this.saving = false;
          this.selectedProfileImage = null;
          this.profileImagePreview = profile.profileUrl ? this.toAbsoluteImageUrl(profile.profileUrl) : null;
          this.form.patchValue({ profileUrl: profile.profileUrl ?? '' });
          this.authService.syncProfile({ fullName: profile.fullName, profileUrl: profile.profileUrl });
          this.message = 'Profile updated successfully.';
          this.toastService.success(this.message);
        },
        error: () => {
          this.saving = false;
          this.errorMessage = 'Failed to update profile. Please try again.';
          this.toastService.error(this.errorMessage);
        },
      });
  }

  private loadProfile() {
    this.loading = true;
    this.userService.getMe().subscribe({
      next: (profile) => {
        this.loading = false;
        this.form.patchValue({
          fullName: profile.fullName,
          mobileNumber: profile.mobileNumber,
          address: profile.address,
          gender: profile.gender,
          preferredContactMethod: profile.preferredContactMethod,
          profileUrl: profile.profileUrl ?? '',
        });

        this.profileImagePreview = profile.profileUrl ? this.toAbsoluteImageUrl(profile.profileUrl) : null;

        this.interestsControls.controls.forEach((control, index) => {
          control.setValue(profile.interests.includes(this.interestsList[index]));
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load profile details.';
        this.toastService.error(this.errorMessage);
      },
    });
  }

  private toAbsoluteImageUrl(profileUrl: string): string {
    if (profileUrl.startsWith('http')) {
      return profileUrl;
    }

    const apiHost = environment.apiUrl.replace('/api', '');
    return `${apiHost}${profileUrl}`;
  }
}
