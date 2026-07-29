// Guided tour for the current KPI workflow. Each step routes to the correct
// module before resolving its target so dynamically-rendered panels still work.
const guidedTourSteps = [
  {
    module: 'dashboard',
    label: 'Thiết lập kỳ',
    target: ['.top-actions', '#roleSelect'],
    title: 'Chọn kỳ, vai trò và trạng thái',
    text: 'Bắt đầu bằng tháng đánh giá, vai trò và người dùng đang thao tác. Admin quản trị toàn phòng; Leader review member cùng team; Member tự đánh giá. Trạng thái kỳ đi từ Nháp đến Đã gửi, Đã duyệt và Đã khóa.'
  },
  {
    module: 'dashboard',
    label: 'Tổng quan',
    target: ['#dashboardCard', '#stats'],
    title: 'Theo dõi hiệu suất và chất lượng dữ liệu',
    text: 'Dashboard tổng hợp điểm, xếp hạng và hiệu suất theo team. Khối chất lượng dữ liệu cảnh báo task chưa map member, thiếu Story Point, deadline, điểm KPI hoặc bộ công thức sai tổng.'
  },
  {
    module: 'evaluation',
    label: 'Đánh giá member',
    target: ['#evaluationContent', '#rankingBody'],
    title: 'Chấm điểm có minh chứng',
    text: 'Chọn một member trong bảng để mở popup đánh giá. Kéo slider cho từng tiêu chí con, chọn các task Jira làm minh chứng, lưu nháp rồi gửi hoặc duyệt theo đúng vai trò. Điểm tổng được tính ngay theo trọng số.'
  },
  {
    module: 'tasks',
    label: 'Tạo task',
    target: ['#taskCard'],
    title: 'Tạo và chuẩn bị task',
    text: 'Tạo task nội bộ, gán member, team, Story Point và deadline. Khi Jira được cấu hình, dữ liệu task có thể dùng làm đầu vào cho đánh giá và đối chiếu tiến độ.'
  },
  {
    module: 'jiraTasks',
    label: 'Task Jira',
    target: ['#jiraTasksCard', '#jiraTasksRoot'],
    title: 'Kiểm tra task Jira đã đồng bộ',
    text: 'Danh sách này hiển thị task thật từ Jira Data Center. Bạn có thể tìm kiếm, lọc trạng thái, chọn đồng thời nhiều field cần xem và nhận biết nhanh từng field bằng màu. Task được tự map với member theo tên hoặc tài khoản đã cấu hình.'
  },
  {
    module: 'comparison',
    label: 'So sánh liên nhóm',
    target: ['#evaluationContent', '#evaluationToolbar'],
    title: 'So sánh công bằng giữa các team',
    text: 'Điểm liên nhóm kết hợp 30% tỷ lệ hoàn thành, 35% effort/Story Point, 25% KPI chất lượng và 10% độ ổn định. Kết quả cuối gồm 75% điểm tuyệt đối và 25% vị trí tương đối trong team, giúp so sánh CMS với API dù số task khác nhau.'
  },
  {
    module: 'timeline',
    label: 'Timeline',
    target: ['#timelineCard'],
    title: 'Quản lý mốc đánh giá và nhắc việc',
    text: 'Thiết lập hạn nhập điểm, hạn Leader review, ngày duyệt và ngày khóa kỳ. Timeline giúp mọi người biết việc cần làm và hạn chế bỏ sót đánh giá.'
  },
  {
    module: 'demo',
    label: 'Trình giả lập',
    target: ['#demoCard'],
    title: 'Chạy thử quy trình bằng dữ liệu giả lập',
    text: 'Trình giả lập tạo dữ liệu task và điểm ngẫu nhiên để bạn xem toàn bộ luồng hoạt động trước khi dùng dữ liệu thật. Mỗi lần chạy có kết quả khác nhau và không thay thế dữ liệu Jira nếu chưa chủ động lưu.'
  },
  {
    module: 'formula',
    label: 'Công thức',
    target: ['#formulaExplainer'],
    title: 'Hiểu và khóa công thức tính điểm',
    text: 'Trang Công thức giải thích điểm tiêu chí, thưởng/trừ, xếp hạng, hệ số KPI và công thức liên nhóm. Khi chốt kỳ, Admin có thể tạo snapshot kèm mã kiểm tra để truy vết đúng phiên bản đã dùng.'
  },
  {
    module: 'criteria',
    label: 'Cấu hình tiêu chí',
    target: ['#criteriaCard', '#criteriaRoot'],
    title: 'Tùy chỉnh tiêu chí cha và tiêu chí con',
    text: 'Admin có thể đổi tên, trọng số, thêm hoặc xóa hạng mục và áp dụng một bộ tiêu chí sang team khác. Tổng trọng số của mỗi team phải đúng 10 điểm để công thức hợp lệ.'
  },
  {
    module: 'settings',
    label: 'Cài đặt',
    target: ['#settingsCard', '#settingsRoot'],
    title: 'Kết nối Jira và backend an toàn',
    text: 'Nhập Jira URL, PAT token, JQL và cấu hình mapping member tại đây; token chỉ được gửi tới backend khi bạn chủ động kết nối. Bạn cũng có thể tải/lưu dữ liệu backend và bật hoặc tắt hiệu ứng chuyển động.'
  },
  {
    module: 'audit',
    label: 'Audit log',
    target: ['#auditCard', '#auditRoot'],
    title: 'Hoàn tất với lịch sử thay đổi',
    text: 'Audit log ghi nhận các lần lưu, đổi trạng thái và thao tác quan trọng theo kỳ. Sau tour, bạn có thể bắt đầu ở Tổng quan hoặc chọn bất kỳ module nào từ thanh menu bên trái.'
  }
];

function guidedTourTarget(step) {
  for (const selector of step.target) {
    const element = document.querySelector(selector);
    if (element && getComputedStyle(element).display !== 'none') return element;
  }
  return document.querySelector(`.module-btn[data-module="${step.module}"]`);
}

function positionGuidedTour(target) {
  const popover = document.querySelector('.tour-popover');
  if (!popover || !target) return;
  const rect = target.getBoundingClientRect();
  const gap = 20;
  const width = Math.min(440, window.innerWidth - 32);
  const height = popover.offsetHeight;
  let left = window.innerWidth - width - 24;
  let top = window.innerHeight - height - 24;

  if (rect.right + width + gap <= window.innerWidth) {
    left = rect.right + gap;
    top = Math.max(16, Math.min(rect.top, window.innerHeight - height - 16));
  } else if (rect.left - width - gap >= 0) {
    left = rect.left - width - gap;
    top = Math.max(16, Math.min(rect.top, window.innerHeight - height - 16));
  } else if (rect.bottom + height + gap <= window.innerHeight) {
    left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
    top = rect.bottom + gap;
  } else if (rect.top - height - gap >= 0) {
    left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
    top = rect.top - height - gap;
  }

  popover.style.width = `${width}px`;
  popover.style.left = `${Math.max(16, left)}px`;
  popover.style.top = `${Math.max(16, top)}px`;
  popover.style.right = 'auto';
  popover.style.bottom = 'auto';
}

tourShow = function () {
  const backdrop = document.querySelector('#tourBackdrop');
  const step = guidedTourSteps[tourIndex];
  if (!backdrop || !step) return;

  if (activeModule !== step.module) setModule(step.module);
  const target = guidedTourTarget(step);
  const reducedMotion = document.documentElement.classList.contains('motion-off')
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelector('#tourStep').textContent = `BƯỚC ${tourIndex + 1} / ${guidedTourSteps.length} · ${step.label.toUpperCase()}`;
  document.querySelector('#tourTitle').textContent = step.title;
  document.querySelector('#tourText').textContent = step.text;
  document.querySelector('#tourPrev').style.visibility = tourIndex ? 'visible' : 'hidden';
  document.querySelector('#tourNext').textContent = tourIndex === guidedTourSteps.length - 1 ? 'Bắt đầu sử dụng' : 'Tiếp theo';
  document.querySelectorAll('.tour-highlight').forEach(element => element.classList.remove('tour-highlight'));
  target?.classList.add('tour-highlight');
  backdrop.classList.remove('hidden');

  target?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
  requestAnimationFrame(() => requestAnimationFrame(() => positionGuidedTour(target)));
};

const guidedTourCloseBase = tourClose;
tourClose = function () {
  guidedTourCloseBase();
  const popover = document.querySelector('.tour-popover');
  if (popover) {
    popover.style.left = '';
    popover.style.top = '';
    popover.style.right = '';
    popover.style.bottom = '';
  }
};

window.addEventListener('resize', () => {
  if (!document.querySelector('#tourBackdrop')?.classList.contains('hidden')) {
    positionGuidedTour(guidedTourTarget(guidedTourSteps[tourIndex]));
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('#tourBackdrop')?.classList.contains('hidden')) tourClose();
  if (event.key === 'ArrowRight' && !document.querySelector('#tourBackdrop')?.classList.contains('hidden')) document.querySelector('#tourNext')?.click();
  if (event.key === 'ArrowLeft' && !document.querySelector('#tourBackdrop')?.classList.contains('hidden')) document.querySelector('#tourPrev')?.click();
});

// Replace the legacy five-step handlers, which otherwise close the expanded
// guide after step five.
document.querySelector('#tourBtn').onclick = () => {
  tourIndex = 0;
  tourShow();
};
document.querySelector('#tourClose').onclick = tourClose;
document.querySelector('#tourPrev').onclick = () => {
  if (tourIndex > 0) {
    tourIndex -= 1;
    tourShow();
  }
};
document.querySelector('#tourNext').onclick = () => {
  if (tourIndex < guidedTourSteps.length - 1) {
    tourIndex += 1;
    tourShow();
  } else {
    tourClose();
  }
};
