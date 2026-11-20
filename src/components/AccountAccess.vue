<script setup lang="ts">
import { onMounted, ref } from "vue";

type AccountUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
};

type AccessMode = "login" | "register";
type NoticeKind = "error" | "success";

const mode = ref<AccessMode>("login");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const firstName = ref("");
const lastName = ref("");
const username = ref("");
const phone = ref("");
const rememberEmail = ref(false);
const showPassword = ref(false);
const isSubmitting = ref(false);
const currentUser = ref<AccountUser | null>(null);
const notice = ref("");
const noticeKind = ref<NoticeKind>("error");

onMounted(() => {
  try {
    const savedEmail = localStorage.getItem("grove-email");
    if (savedEmail) {
      email.value = savedEmail;
      rememberEmail.value = true;
    }
  } catch {
    rememberEmail.value = false;
  }
  void loadCurrentUser();
});

function setNotice(message: string, kind: NoticeKind = "error") {
  notice.value = message;
  noticeKind.value = kind;
}

function changeMode(nextMode: AccessMode) {
  mode.value = nextMode;
  notice.value = "";
  showPassword.value = false;
}

async function requestAuth(path: string, payload?: Record<string, string>) {
  let response: Response;
  try {
    response = await fetch(path, {
      method: payload ? "POST" : "GET",
      credentials: "same-origin",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
  } catch {
    throw new Error("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
  }

  const result = (await response.json().catch(() => ({}))) as {
    user?: AccountUser;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(result.message ?? "ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
  }
  return result;
}

async function loadCurrentUser() {
  try {
    const result = await requestAuth("/api/auth/me");
    currentUser.value = result.user ?? null;
  } catch {
    currentUser.value = null;
  }
}

async function submitLogin() {
  isSubmitting.value = true;
  notice.value = "";
  try {
    const result = await requestAuth("/api/auth/login", {
      email: email.value.trim(),
      password: password.value,
    });
    currentUser.value = result.user ?? null;
    try {
      if (rememberEmail.value) {
        localStorage.setItem("grove-email", email.value.trim());
      } else {
        localStorage.removeItem("grove-email");
      }
    } catch {
      rememberEmail.value = false;
    }
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "เข้าสู่ระบบไม่สำเร็จ");
  } finally {
    isSubmitting.value = false;
  }
}

async function submitRegistration() {
  if (password.value !== confirmPassword.value) {
    setNotice("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    return;
  }

  isSubmitting.value = true;
  notice.value = "";
  try {
    const result = await requestAuth("/api/auth/register", {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      username: username.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      password: password.value,
    });
    currentUser.value = result.user ?? null;
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "สมัครสมาชิกไม่สำเร็จ");
  } finally {
    isSubmitting.value = false;
  }
}

async function logout() {
  isSubmitting.value = true;
  try {
    await requestAuth("/api/auth/logout", {});
    currentUser.value = null;
    password.value = "";
    confirmPassword.value = "";
    changeMode("login");
    setNotice("ออกจากระบบแล้ว", "success");
  } catch (error) {
    setNotice(error instanceof Error ? error.message : "ออกจากระบบไม่สำเร็จ");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div v-if="currentUser" class="account-state">
    <div class="form-heading">
      <p class="eyebrow form-eyebrow">เข้าสู่ระบบแล้ว</p>
      <h2>ยินดีต้อนรับ {{ currentUser.firstName }}</h2>
      <p class="form-intro">บัญชี Grove ของคุณพร้อมใช้งาน</p>
    </div>

    <dl class="account-details">
      <div>
        <dt>ชื่อผู้ใช้</dt>
        <dd>@{{ currentUser.username }}</dd>
      </div>
      <div>
        <dt>อีเมล</dt>
        <dd>{{ currentUser.email }}</dd>
      </div>
      <div>
        <dt>เบอร์โทรศัพท์</dt>
        <dd>{{ currentUser.phone }}</dd>
      </div>
    </dl>

    <button
      class="submit-button"
      type="button"
      :disabled="isSubmitting"
      @click="logout"
    >
      <span>{{ isSubmitting ? "กำลังออกจากระบบ..." : "ออกจากระบบ" }}</span>
      <span class="submit-arrow" aria-hidden="true">↗</span>
    </button>
    <p v-if="notice" class="form-notice form-notice--success" role="status">
      {{ notice }}
    </p>
  </div>

  <template v-else>
    <div class="form-heading">
      <p class="eyebrow form-eyebrow">
        {{ mode === "login" ? "ยินดีต้อนรับกลับมา" : "เริ่มต้นพื้นที่ของคุณ" }}
      </p>
      <h2>{{ mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก" }}</h2>
      <p class="form-intro">
        {{
          mode === "login"
            ? "กรอกข้อมูลเพื่อกลับไปยังพื้นที่ทำงานของคุณ"
            : "กรอกข้อมูลพื้นฐานเพื่อสร้างบัญชี Grove"
        }}
      </p>
    </div>

    <form
      v-if="mode === 'login'"
      class="login-form"
      @submit.prevent="submitLogin"
      @input="notice = ''"
    >
      <label class="field-label" for="login-email">อีเมล</label>
      <div class="input-wrap">
        <span class="input-symbol" aria-hidden="true">@</span>
        <input
          id="login-email"
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="name@example.com"
          required
        />
      </div>

      <div class="password-label-row">
        <label class="field-label" for="login-password">รหัสผ่าน</label>
        <span class="password-hint">อย่างน้อย 8 ตัวอักษร</span>
      </div>
      <div class="input-wrap">
        <span class="input-symbol lock-symbol" aria-hidden="true"></span>
        <input
          id="login-password"
          v-model="password"
          name="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          placeholder="กรอกรหัสผ่าน"
          minlength="8"
          required
        />
        <button
          class="visibility-button"
          type="button"
          :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
          :aria-pressed="showPassword"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? "ซ่อน" : "แสดง" }}
        </button>
      </div>

      <div class="form-options">
        <label class="remember-option">
          <input v-model="rememberEmail" type="checkbox" />
          <span class="custom-check" aria-hidden="true"></span>
          <span>จดจำอีเมลของฉัน</span>
        </label>
        <span class="recovery-note">ลืมรหัสผ่าน? ติดต่อผู้ดูแล</span>
      </div>

      <button class="submit-button" type="submit" :disabled="isSubmitting">
        <span>{{ isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ" }}</span>
        <span class="submit-arrow" aria-hidden="true">↗</span>
      </button>

      <p v-if="notice" class="form-notice" role="alert">{{ notice }}</p>
      <p class="mode-switch">
        ยังไม่มีบัญชี?
        <button
          class="text-button"
          type="button"
          @click="changeMode('register')"
        >
          สมัครสมาชิกใหม่
        </button>
      </p>
    </form>

    <form
      v-else
      class="login-form register-form"
      @submit.prevent="submitRegistration"
      @input="notice = ''"
    >
      <div class="field-pair">
        <div class="field-control">
          <label class="field-label" for="register-first-name">ชื่อ</label>
          <div class="input-wrap">
            <input
              id="register-first-name"
              v-model="firstName"
              name="firstName"
              autocomplete="given-name"
              placeholder="ชื่อของคุณ"
              maxlength="80"
              required
            />
          </div>
        </div>
        <div class="field-control">
          <label class="field-label" for="register-last-name">นามสกุล</label>
          <div class="input-wrap">
            <input
              id="register-last-name"
              v-model="lastName"
              name="lastName"
              autocomplete="family-name"
              placeholder="นามสกุล"
              maxlength="80"
              required
            />
          </div>
        </div>
      </div>

      <label class="field-label" for="register-username">ชื่อผู้ใช้</label>
      <div class="input-wrap">
        <span class="input-symbol" aria-hidden="true">@</span>
        <input
          id="register-username"
          v-model="username"
          name="username"
          autocomplete="username"
          placeholder="อย่างน้อย 3 ตัวอักษร"
          minlength="3"
          maxlength="30"
          required
        />
      </div>

      <label class="field-label" for="register-email">อีเมล</label>
      <div class="input-wrap">
        <input
          id="register-email"
          v-model="email"
          name="email"
          type="email"
          autocomplete="email"
          placeholder="name@example.com"
          maxlength="254"
          required
        />
      </div>

      <label class="field-label" for="register-phone">เบอร์โทรศัพท์</label>
      <div class="input-wrap">
        <input
          id="register-phone"
          v-model="phone"
          name="phone"
          type="tel"
          autocomplete="tel"
          placeholder="0812345678"
          maxlength="20"
          required
        />
      </div>

      <div class="password-label-row">
        <label class="field-label" for="register-password">รหัสผ่าน</label>
        <span class="password-hint">อย่างน้อย 8 ตัวอักษร</span>
      </div>
      <div class="input-wrap">
        <input
          id="register-password"
          v-model="password"
          name="password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="ตั้งรหัสผ่าน"
          minlength="8"
          maxlength="72"
          required
        />
        <button
          class="visibility-button"
          type="button"
          :aria-label="showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'"
          :aria-pressed="showPassword"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? "ซ่อน" : "แสดง" }}
        </button>
      </div>

      <label class="field-label" for="register-confirm-password"
        >ยืนยันรหัสผ่าน</label
      >
      <div class="input-wrap">
        <input
          id="register-confirm-password"
          v-model="confirmPassword"
          name="confirmPassword"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="กรอกรหัสผ่านอีกครั้ง"
          minlength="8"
          maxlength="72"
          required
        />
      </div>

      <button class="submit-button" type="submit" :disabled="isSubmitting">
        <span>{{ isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชี" }}</span>
        <span class="submit-arrow" aria-hidden="true">↗</span>
      </button>

      <p v-if="notice" class="form-notice" role="alert">{{ notice }}</p>
      <p class="mode-switch">
        มีบัญชีแล้ว?
        <button class="text-button" type="button" @click="changeMode('login')">
          เข้าสู่ระบบ
        </button>
      </p>
    </form>
  </template>
</template>
