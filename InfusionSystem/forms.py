from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User


class SignupForm(UserCreationForm):
    username = forms.CharField(
        max_length=150,
        required=True,
        help_text="",
        widget=forms.TextInput(attrs={"placeholder": "username"}),
    )
    password1 = forms.CharField(
        label="Password",
        widget=forms.PasswordInput(attrs={"placeholder": "Password"}),
        help_text="",
    )
    password2 = forms.CharField(
        label="Password confirmation",
        widget=forms.PasswordInput(attrs={"placeholder": "Confirm Password"}),
        help_text="",
    )

    class Meta:
        model = User
        fields = ["username", "password1", "password2"]


class LoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)
