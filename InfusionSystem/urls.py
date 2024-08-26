"""
URL configuration for InfusionSystem project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path
from .views import SignUpView, LoginView


from . import views


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", views.index, name="index"),
    path("collect/", views.collect_user_info, name="collect_user_info"),
    path("success/", views.success, name="success"),
    path("infusion_system_mz/", views.infusion_system_mz, name="infusion_system_mz"),
    path("api/scan-device/<str:device_number>", views.scan_device, name="scan_device"),
    path(
        "api/scan-patient-mz/<str:patient_id>",
        views.scan_patient_mz,
        name="scan_patient",
    ),
    path(
        "api/scan-patient-zy/<str:patient_id>",
        views.scan_patient_zy,
        name="scan_patient_zy",
    ),
    path("api/update_zyrecord/", views.update_zyrecord, name="update_zyrecord"),
    path(
        "api/check-device-status/<str:device_number>",
        views.check_device_status,
        name="scan_device",
    ),
    path("infusion_system_zy/", views.infusion_system_zy, name="infusion_system_zy"),
    path(
        "login/infusion_system_zy/",
        views.infusion_system_zy,
        name="infusion_system_zy",
    ),
    path(
        "infusion_system_white_board/",
        views.infusion_system_white_board,
        name="infusion_system_white_board",
    ),
    path(
        "api/update_patient_infusion_information/",
        views.update_patient_infusion_information,
        name="update_patient_infusion_information",
    ),
    path(
        "api/patient_infusion_info/",
        views.patient_infusion_info,
        name="patient_infusion_info",
    ),
    path("signup/", SignUpView.as_view(), name="signup"),
    path("login/", LoginView.as_view(), name="login"),
]
