
import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth-service';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { ToastService } from '../../../core/services/toast-service';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly fb = inject(FormBuilder);

  readonly interstsList = ['Fast Food','Chinese','Indian', 'Healthy'];
  loading = false;

  imageError = ''
  selectedProfileImage: File | null = null;
  profileImagePreview:string | null = null;
  hidePassword = true;
  hideConfirmPassword = true;

  readonly form = this.fb.group({
    fullName:['',[Validators.required]],
    email:['',[Validators.required,Validators.email]],
    password:['',[Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword:['',[Validators.required]],
    mobileNumber:['',[Validators.required,Validators.pattern(/^\d{10}$/)]],
    address:['',[Validators.required, Validators.minLength(8)]],
    profileUrl:[''],
    gender:['',[Validators.required]],
    interests:this.fb.array(this.interstsList.map(() => this.fb.control(false))),
    preferredContactMethod:['Email',[Validators.required]]
  })

  constructor(
    private readonly authService:AuthService,
    private readonly router:Router,
    private readonly toastService: ToastService
  ){}

  get interestsControls(){
   return this.form.get('interests') as FormArray;
  }

  onProfileImageChange(event:Event){
    const input = event?.target as HTMLInputElement;
    const file = input.files?.[0];

    if(!file){
      this.selectedProfileImage = null;
      return
    }

    const isValidType = ['image/png','image/jpeg'].includes(file.type);
    if(!isValidType){
      this.imageError = "Only jpg and png files allowed."
      this.selectedProfileImage = null;
      this.form.patchValue({profileUrl:''});
      this.profileImagePreview = null;
      return;
    }
    
    this.imageError = '';
    this.selectedProfileImage = file;
    this.form.patchValue({profileUrl:file.name});


    const reader = new FileReader();
    reader.onload = () =>{
      this.profileImagePreview = typeof reader.result === 'string'? reader.result : null;
    };
    reader.readAsDataURL(file);
  }

  submit(){
    if(this.form.invalid || this.passwordMismatch || !this.hasSelectedInterest || this.loading || !!this.imageError){
      this.form.markAsTouched();
      return
    }

    const selectedInterests = this.interestsControls.controls.map((control, index) => (control.value ? this.interstsList[index]:null))
    .filter((item): item is string => !!item);
    
    const value = this.form.getRawValue();
    const payload = {
      fullName: value.fullName ?? '',
      email:value.email ?? '',
      password: value.password ?? '',
      confirmPassword:value.confirmPassword ?? '',
      mobileNumber: value.mobileNumber ?? '',
      address: value.address ?? '',
      profileUrl: value.profileUrl ?? '',
      profileImage: this.selectedProfileImage,
      gender: value.gender ?? '',
      preferredContactMethod:value.preferredContactMethod ?? '',
      interests:selectedInterests
    };

    this.loading = true;
    this.authService.register(payload).subscribe({
      next:() => {
        this.loading = false;
        this.router.navigate(['/menu']);
        this.toastService.success('Registration successful.');
      },
      error:() => {
        this.loading = false;
        this.toastService.error('Registration failed. Please try again.');
      }
    });
  }

  get passwordMismatch():boolean{
    return this.form.controls.password.value !== this.form.controls.confirmPassword.value;
  }
  get hasSelectedInterest():boolean{
    return this.interestsControls.controls.some((control) => !!control.value);
  }
}
