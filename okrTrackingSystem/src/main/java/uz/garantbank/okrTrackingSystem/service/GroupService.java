package uz.garantbank.okrTrackingSystem.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.garantbank.okrTrackingSystem.dto.*;
import uz.garantbank.okrTrackingSystem.entity.*;
import uz.garantbank.okrTrackingSystem.repository.*;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final DepartmentRepository departmentRepository;
    private final ObjectiveRepository objectiveRepository;
    private final KeyResultRepository keyResultRepository;
    private final UserRepository userRepository;
    private final ScoreCalculationService scoreService;

    @Transactional(readOnly = true)
    public List<GroupDTO> getGroupsByDepartment(String departmentId) {
        try {
            return groupRepository.findByDepartmentIdWithObjectives(departmentId).stream()
                    .map(this::toGroupDTO)
                    .collect(Collectors.toList());
        } finally {
            scoreService.clearCache();
        }
    }

    @Transactional(readOnly = true)
    public GroupDTO getGroup(String id) {
        try {
            OrgGroup group = groupRepository.findByIdWithObjectives(id)
                    .orElseThrow(() -> new IllegalArgumentException("Group not found: " + id));
            return toGroupDTO(group);
        } finally {
            scoreService.clearCache();
        }
    }

    @Transactional
    public GroupDTO createGroup(GroupDTO dto) {
        Department dept = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new IllegalArgumentException("Department not found: " + dto.getDepartmentId()));

        OrgGroup group = OrgGroup.builder()
                .name(dto.getName())
                .department(dept)
                .build();

        if (dto.getLeader() != null && dto.getLeader().getId() != null) {
            User leader = userRepository.findById(dto.getLeader().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Leader not found"));
            group.setGroupLeader(leader);
        }

        return toGroupDTO(groupRepository.save(group));
    }

    @Transactional
    public GroupDTO updateGroup(String id, GroupDTO dto) {
        OrgGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Group not found: " + id));

        if (dto.getName() != null && !dto.getName().isBlank()) {
            group.setName(dto.getName());
        }

        if (dto.getLeader() != null && dto.getLeader().getId() != null) {
            User leader = userRepository.findById(dto.getLeader().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Leader not found"));
            group.setGroupLeader(leader);
        }

        return toGroupDTO(groupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(String id) {
        groupRepository.deleteById(id);
    }

    @Transactional
    public GroupDTO updateMembers(String groupId, List<String> userIds) {
        OrgGroup group = groupRepository.findByIdWithMembers(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found: " + groupId));

        Set<User> members = new HashSet<>();
        for (String uid : userIds) {
            User user = userRepository.findById(UUID.fromString(uid))
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + uid));
            members.add(user);
        }
        group.setMembers(members);
        groupRepository.save(group);

        return toGroupDTO(groupRepository.findByIdWithObjectives(groupId).orElse(group));
    }

    @Transactional
    public ObjectiveDTO createGroupObjective(String groupId, ObjectiveDTO dto) {
        OrgGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found: " + groupId));

        Objective obj = Objective.builder()
                .name(dto.getName())
                .weight(dto.getWeight() != null ? dto.getWeight() : 0)
                .group(group)
                .department(group.getDepartment())
                .level(ObjectiveLevel.GROUP)
                .keyResults(new java.util.ArrayList<>())
                .build();

        obj = objectiveRepository.save(obj);
        return toObjectiveDTO(obj);
    }

    @Transactional(readOnly = true)
    public List<ObjectiveDTO> getGroupObjectives(String groupId) {
        return objectiveRepository.findByGroupIdWithKeyResults(groupId).stream()
                .map(this::toObjectiveDTO)
                .collect(Collectors.toList());
    }

    private GroupDTO toGroupDTO(OrgGroup group) {
        GroupDTO.GroupDTOBuilder builder = GroupDTO.builder()
                .id(group.getId())
                .name(group.getName())
                .departmentId(group.getDepartment().getId())
                .departmentName(group.getDepartment().getName());

        if (group.getGroupLeader() != null) {
            builder.leader(UserSummaryDTO.builder()
                    .id(group.getGroupLeader().getId())
                    .username(group.getGroupLeader().getUsername())
                    .fullName(group.getGroupLeader().getFullName())
                    .profilePhotoUrl(group.getGroupLeader().getProfilePhotoUrl())
                    .build());
        }

        // Objectives
        if (group.getObjectives() != null && !group.getObjectives().isEmpty()) {
            List<Objective> groupObjs = group.getObjectives().stream()
                    .filter(o -> o.getLevel() == ObjectiveLevel.GROUP)
                    .collect(Collectors.toList());

            builder.objectives(groupObjs.stream().map(this::toObjectiveDTO).collect(Collectors.toList()));
            builder.score(scoreService.calculateDepartmentScore(groupObjs));
        } else {
            builder.objectives(Collections.emptyList());
        }

        // Members
        try {
            OrgGroup withMembers = groupRepository.findByIdWithMembers(group.getId()).orElse(group);
            builder.members(withMembers.getMembers().stream()
                    .map(u -> UserSummaryDTO.builder()
                            .id(u.getId())
                            .username(u.getUsername())
                            .fullName(u.getFullName())
                            .profilePhotoUrl(u.getProfilePhotoUrl())
                            .build())
                    .collect(Collectors.toList()));
        } catch (Exception e) {
            builder.members(Collections.emptyList());
        }

        return builder.build();
    }

    private ObjectiveDTO toObjectiveDTO(Objective obj) {
        List<KeyResultDTO> krs = obj.getKeyResults().stream()
                .map(this::toKeyResultDTO)
                .collect(Collectors.toList());

        return ObjectiveDTO.builder()
                .id(obj.getId())
                .name(obj.getName())
                .weight(obj.getWeight())
                .departmentId(obj.getDepartment() != null ? obj.getDepartment().getId() : null)
                .keyResults(krs)
                .score(scoreService.calculateObjectiveScore(obj.getKeyResults()))
                .build();
    }

    private KeyResultDTO toKeyResultDTO(KeyResult kr) {
        return KeyResultDTO.builder()
                .id(kr.getId())
                .name(kr.getName())
                .description(kr.getDescription())
                .metricType(kr.getMetricType())
                .unit(kr.getUnit())
                .weight(kr.getWeight())
                .thresholds(ThresholdDTO.builder()
                        .below(kr.getThresholdBelow())
                        .meets(kr.getThresholdMeets())
                        .good(kr.getThresholdGood())
                        .veryGood(kr.getThresholdVeryGood())
                        .exceptional(kr.getThresholdExceptional())
                        .build())
                .actualValue(kr.getActualValue())
                .objectiveId(kr.getObjective().getId())
                .score(scoreService.calculateKeyResultScore(kr))
                .build();
    }
}
