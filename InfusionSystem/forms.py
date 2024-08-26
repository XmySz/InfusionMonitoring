# forms.py
from django import forms
from django.contrib.auth.forms import UserCreationForm
from .models import InfusionSystemUserInfo


class InfusionSystemUserCreationForm(UserCreationForm):
    class Meta:
        model = InfusionSystemUserInfo
        fields = (
            "employee_id",
            "name",
            "department",
            "password1",
            "password2",
            "group_number",
        )


class InfusionSystemUserLoginForm(forms.Form):
    employee_id = forms.CharField(label="工号")
    password = forms.CharField(label="密码", widget=forms.PasswordInput)
