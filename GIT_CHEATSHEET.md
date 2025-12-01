# Git Workflow Cheatsheet for HR Platform

## 🎯 **Recommended Workflow: Feature Branch with Squash Merge**

### **Phase 1: Starting a New Feature**

```bash
# 1. Always start from main and update it first
git checkout main
git pull origin main

# 2. Create a new feature branch
git checkout -b feature/your-feature-name

# Examples:
# git checkout -b feature/employee-pagination
# git checkout -b feature/add-search-filter
# git checkout -b feature/fix-login-bug
```

---

### **Phase 2: Working on Your Feature**

```bash
# Make changes to your files, then commit frequently:

# Stage your changes
git add .

# Or stage specific files
git add src/app/employees/page.tsx
git add src/app/api/employees/route.ts

# Commit with a descriptive message
git commit -m "Add pagination state management"

# Continue working and committing...
git add .
git commit -m "Update API route for pagination support"

git add .
git commit -m "Add pagination UI components"

# Push your branch (can push multiple commits)
git push -u origin feature/your-feature-name
```

**💡 Tip:** Commit frequently! It's like saving your work. You'll squash them later anyway.

---

### **Phase 3: Pushing Your Work**

```bash
# Push your branch (first time)
git push -u origin feature/your-feature-name

# Push additional commits (after first push)
git push
```

---

### **Phase 4: Creating a Pull Request**

1. Go to GitHub → Your repository
2. Click "Compare & pull request" (appears after pushing)
3. Write a clear PR description
4. Request review if needed
5. Click "Create pull request"

---

### **Phase 5: Merging (The Squash Part!)**

**On GitHub:**
1. Go to your Pull Request
2. Click the dropdown next to "Merge pull request"
3. Select **"Squash and merge"** ⭐ (This is the key!)
4. Edit the commit message (combine all your commit messages)
5. Click "Confirm squash and merge"
6. Delete the branch after merging (GitHub will offer this)

**Result:** All your commits become ONE clean commit on main! 🎉

---

## 🔧 **Common Commands Reference**

### **Checking Status**

```bash
# See what branch you're on and what files changed
git status

# See your commit history
git log --oneline

# See all branches
git branch

# See remote branches
git branch -r
```

### **Switching Branches**

```bash
# Switch to main
git checkout main

# Switch to a feature branch
git checkout feature/your-feature-name

# Create and switch to new branch
git checkout -b feature/new-feature
```

### **Handling Uncommitted Changes**

```bash
# If you have uncommitted changes and need to switch branches:

# Option 1: Commit them first
git add .
git commit -m "WIP: work in progress"

# Option 2: Stash them (save for later)
git stash
# ... switch branches, do work ...
git stash pop  # Get your changes back

# Option 3: Discard changes (CAREFUL!)
git checkout -- .  # Discards all uncommitted changes
```

### **Updating Your Branch**

```bash
# If main has new commits and you want to update your feature branch:

# Method 1: Merge main into your branch
git checkout feature/your-feature-name
git merge main

# Method 2: Rebase your branch on main (cleaner history)
git checkout feature/your-feature-name
git rebase main
```

---

## 🚨 **Troubleshooting**

### **"Your local changes would be overwritten"**

```bash
# Commit or stash your changes first
git add .
git commit -m "Your message"
# OR
git stash
```

### **"Branch is behind origin"**

```bash
# Pull latest changes
git pull origin feature/your-feature-name
```

### **"Need to undo last commit"**

```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Undo commit and discard changes (CAREFUL!)
git reset --hard HEAD~1
```

### **"Made a mistake, want to start over"**

```bash
# Discard all uncommitted changes
git checkout -- .

# Reset to match remote exactly
git fetch origin
git reset --hard origin/feature/your-feature-name
```

---

## 📋 **Complete Workflow Example**

```bash
# === STARTING A NEW FEATURE ===

# 1. Update main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/add-employee-search

# 3. Work and commit frequently
git add src/app/employees/page.tsx
git commit -m "Add search input component"

git add src/app/employees/page.tsx
git commit -m "Implement search filtering logic"

git add src/app/employees/page.tsx
git commit -m "Add search UI styling"

# 4. Push branch
git push -u origin feature/add-employee-search

# 5. Create PR on GitHub
# 6. Use "Squash and merge" when ready
# 7. Delete branch after merging

# === CLEANUP AFTER MERGE ===
git checkout main
git pull origin main
git branch -d feature/add-employee-search  # Delete local branch
```

---

## ✅ **Best Practices Checklist**

- [ ] Always start from updated `main` branch
- [ ] Use descriptive branch names: `feature/...`, `fix/...`, `refactor/...`
- [ ] Commit frequently with clear messages
- [ ] Push your branch regularly (backup your work)
- [ ] Use "Squash and merge" on GitHub (not regular merge)
- [ ] Delete branches after merging
- [ ] Write clear PR descriptions
- [ ] Test your code before creating PR

---

## 🎓 **Commit Message Guidelines**

### **Good Commit Messages:**
```
✅ "Add pagination state management"
✅ "Fix login redirect after password change"
✅ "Update employee API to support filtering"
✅ "Refactor role-based access control logic"
```

### **Bad Commit Messages:**
```
❌ "update"
❌ "fix"
❌ "changes"
❌ "asdf"
```

**Format:** Use imperative mood (Add, Fix, Update, Remove, etc.)

---

## 🔄 **If You Need to Squash Commits Locally (Before PR)**

```bash
# Squash last 3 commits into one
git rebase -i HEAD~3

# In the editor that opens:
# - Change "pick" to "squash" (or "s") for commits you want to combine
# - Save and close
# - Edit the combined commit message
# - Save and close again

# Force push (only if you haven't created PR yet!)
git push --force-with-lease origin feature/your-feature-name
```

**⚠️ Warning:** Only do this if you haven't created a PR yet, or if you're the only one working on the branch!

---

## 📝 **Quick Reference Card**

```bash
# Daily workflow
git status                    # Check what's changed
git add .                     # Stage all changes
git commit -m "message"       # Commit changes
git push                      # Push to remote

# Starting new work
git checkout main && git pull
git checkout -b feature/name

# After PR is merged
git checkout main && git pull
git branch -d feature/name    # Delete local branch
```

---

## 🎯 **Your Current Situation**

You now have:
- ✅ `feature/all-features-squashed` - All your features in ONE clean commit
- ✅ Ready to create a PR and merge to main

**Next Steps:**
1. Create PR from `feature/all-features-squashed` to `main`
2. Use "Squash and merge" (though it's already squashed!)
3. After merging, use this cheatsheet for future features

---

**Remember:** The key is using "Squash and merge" on GitHub PRs. This automatically combines all your commits into one clean commit on main! 🚀

