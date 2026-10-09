// 迁移清单 —— 显式登记而非 glob 扫描
// 与 ENTITIES 同样的理由：glob 依赖运行时目录结构，nest build 产物与
// ts-node 直跑的路径形状不同，一处能跑另一处静默跑不到，
// 而「迁移没被发现」表现为「什么都没发生」，最难排查
import { Baseline1790000000000 } from './1790000000000-Baseline'
import { AddContentStatus1790000001000 } from './1790000001000-AddContentStatus'
import { AddAdminPwdChangedAt1790000002000 } from './1790000002000-AddAdminPwdChangedAt'
import { AddAdminOpLog1790000003000 } from './1790000003000-AddAdminOpLog'
import { AddOpLogChannel1790000004000 } from './1790000004000-AddOpLogChannel'
import { AddCaseContentCategory1790000005000 } from './1790000005000-AddCaseContentCategory'
import { AddHouseholdBanner1790000006000 } from './1790000006000-AddHouseholdBanner'
import { AlignHomeFormFields1790000007000 } from './1790000007000-AlignHomeFormFields'
import { MoveCategoryTitleToName1790000008000 } from './1790000008000-MoveCategoryTitleToName'
import { FlattenContentGroups1790000009000 } from './1790000009000-FlattenContentGroups'
import { HomeSectionHeadings1790000010000 } from './1790000010000-HomeSectionHeadings'
import { AddChannelHidden1790000011000 } from './1790000011000-AddChannelHidden'
import { AddContentExtra1790000012000 } from './1790000012000-AddContentExtra'
import { AddFeedbackLeadFields1790000013000 } from './1790000013000-AddFeedbackLeadFields'
import { AddChannelMenuFields1790000014000 } from './1790000014000-AddChannelMenuFields'

/**
 * 全部迁移，按执行顺序排列
 * 类名末尾的时间戳即 TypeORM 的排序依据，新增迁移必须取更大的值
 */
export const MIGRATIONS = [
  Baseline1790000000000,
  AddContentStatus1790000001000,
  AddAdminPwdChangedAt1790000002000,
  AddAdminOpLog1790000003000,
  AddOpLogChannel1790000004000,
  AddCaseContentCategory1790000005000,
  AddHouseholdBanner1790000006000,
  AlignHomeFormFields1790000007000,
  MoveCategoryTitleToName1790000008000,
  FlattenContentGroups1790000009000,
  HomeSectionHeadings1790000010000,
  AddChannelHidden1790000011000,
  AddContentExtra1790000012000,
  AddFeedbackLeadFields1790000013000,
  AddChannelMenuFields1790000014000,
]
