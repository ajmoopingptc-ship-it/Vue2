<script setup lang="ts">
import AccountAccess from "./components/AccountAccess.vue";
</script>

<template>
  <main class="login-layout">
    <section class="brand-panel" aria-label="Grove workspace">
      <header class="brand-lockup">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span class="brand-name">grove<span class="brand-period">.</span></span>
      </header>

      <div class="brand-copy">
        <p class="eyebrow">A CALMER WAY TO WORK</p>
        <h1>พื้นที่ดี ๆ<br />ทำให้ไอเดีย<br /><span>เติบโตได้</span></h1>
        <p class="brand-description">
          กลับไปต่อยอดสิ่งที่คุณกำลังสร้าง<br />ทีละวัน ในจังหวะของคุณเอง
        </p>
      </div>

      <div class="garden-art" aria-hidden="true">
        <div class="art-grid"></div>
        <div class="art-sun"></div>
        <div class="art-stem stem-one"><i></i><b></b></div>
        <div class="art-stem stem-two"><i></i><b></b></div>
        <div class="art-stem stem-three"><i></i><b></b></div>
        <div class="art-ground"></div>
        <span class="art-caption">GROW AT YOUR OWN PACE</span>
      </div>

      <footer class="brand-footer">
        <span>พื้นที่ของคุณ รออยู่ตรงนี้</span>
        <span class="footer-index">01 — 03</span>
      </footer>
    </section>

    <section class="form-panel">
      <div class="mobile-brand" aria-hidden="true">
        <span class="brand-mark"><span></span></span>
        <span class="brand-name">grove<span class="brand-period">.</span></span>
      </div>

      <div class="form-wrap">
        <AccountAccess />
      </div>

      <footer class="legal-footer">
        <span>© 2026 Grove Workspace</span>
        <span>สร้างพื้นที่ให้ความคิดเติบโต</span>
      </footer>
    </section>
  </main>
</template>
