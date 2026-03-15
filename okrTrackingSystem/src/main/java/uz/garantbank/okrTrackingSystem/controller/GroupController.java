package uz.garantbank.okrTrackingSystem.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import uz.garantbank.okrTrackingSystem.dto.GroupDTO;
import uz.garantbank.okrTrackingSystem.dto.ObjectiveDTO;
import uz.garantbank.okrTrackingSystem.service.DepartmentAccessService;
import uz.garantbank.okrTrackingSystem.service.GroupService;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
@Tag(name = "Groups", description = "Group management within departments")
public class GroupController {

    private final GroupService groupService;
    private final DepartmentAccessService accessService;

    @Operation(summary = "Get groups by department")
    @GetMapping("/departments/{deptId}/groups")
    public ResponseEntity<List<GroupDTO>> getGroupsByDepartment(@PathVariable("deptId") String deptId) {
        return ResponseEntity.ok(groupService.getGroupsByDepartment(deptId));
    }

    @Operation(summary = "Get group by ID")
    @GetMapping("/groups/{id}")
    public ResponseEntity<GroupDTO> getGroup(@PathVariable("id") String id) {
        return ResponseEntity.ok(groupService.getGroup(id));
    }

    @Operation(summary = "Create group")
    @PostMapping("/groups")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR', 'DEPARTMENT_LEADER')")
    public ResponseEntity<GroupDTO> createGroup(@RequestBody GroupDTO dto) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        return ResponseEntity.ok(groupService.createGroup(dto));
    }

    @Operation(summary = "Update group")
    @PutMapping("/groups/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR', 'DEPARTMENT_LEADER')")
    public ResponseEntity<GroupDTO> updateGroup(@PathVariable("id") String id, @RequestBody GroupDTO dto) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        return ResponseEntity.ok(groupService.updateGroup(id, dto));
    }

    @Operation(summary = "Delete group")
    @DeleteMapping("/groups/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    public ResponseEntity<Void> deleteGroup(@PathVariable("id") String id) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        groupService.deleteGroup(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Update group members")
    @PutMapping("/groups/{id}/members")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR', 'DEPARTMENT_LEADER')")
    public ResponseEntity<GroupDTO> updateMembers(@PathVariable("id") String id, @RequestBody Map<String, List<String>> body) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        List<String> userIds = body.getOrDefault("userIds", List.of());
        return ResponseEntity.ok(groupService.updateMembers(id, userIds));
    }

    @Operation(summary = "Create group objective")
    @PostMapping("/groups/{groupId}/objectives")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR', 'DEPARTMENT_LEADER')")
    public ResponseEntity<ObjectiveDTO> createGroupObjective(
            @PathVariable("groupId") String groupId, @RequestBody ObjectiveDTO dto) {
        accessService.requireWriteAccess(accessService.getCurrentUser());
        return ResponseEntity.ok(groupService.createGroupObjective(groupId, dto));
    }

    @Operation(summary = "Get group objectives")
    @GetMapping("/groups/{groupId}/objectives")
    public ResponseEntity<List<ObjectiveDTO>> getGroupObjectives(@PathVariable("groupId") String groupId) {
        return ResponseEntity.ok(groupService.getGroupObjectives(groupId));
    }
}
