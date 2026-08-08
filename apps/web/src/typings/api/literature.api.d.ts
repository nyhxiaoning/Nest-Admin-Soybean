declare namespace Api {
  namespace Literature {
    /** 文稿 */
    type Manuscript = Common.CommonRecord<{
      /** 文稿 ID */
      manuscriptId: CommonType.IdType;
      /** 标题 */
      title: string;
      /** 字数 */
      wordCount: number;
      /** 状态 */
      status: '0' | '1' | '2' | '3';
      /** 标签列表 */
      tags: Array<{ tagId: number; tagName: string; color: string }>;
    }>;

    /** 文稿详情（含内容） */
    type ManuscriptDetail = Common.CommonRecord<{
      manuscriptId: CommonType.IdType;
      title: string;
      content: string;
      wordCount: number;
      status: string;
      tags: Array<{ tagId: number; tagName: string; color: string }>;
    }>;

    /** 文稿列表 */
    type ManuscriptList = Common.PaginatingQueryRecord<Manuscript>;

    /** 素材 */
    type Material = Common.CommonRecord<{
      materialId: CommonType.IdType;
      type: '0' | '1' | '2';
      content: string;
      source?: string;
    }>;

    /** 素材列表 */
    type MaterialList = Common.PaginatingQueryRecord<Material>;

    /** 标签 */
    type Tag = Common.CommonRecord<{
      tagId: CommonType.IdType;
      tagName: string;
      color: string;
      /** 关联文稿数（工作台用） */
      manuscriptCount?: number;
    }>;

    /** 标签列表 */
    type TagList = Common.PaginatingQueryRecord<Tag>;

    /** 编辑室设置 */
    type Setting = Common.CommonRecord<{
      settingId: CommonType.IdType;
      fontSize: number;
      fontFamily: string;
      autosave: '0' | '1';
      autosaveInterval: number;
      exportFormat: 'md' | 'pdf';
    }>;

    /** 工作台概览 */
    type WorkbenchOverview = Common.CommonRecord<{
      totalDrafts: number;
      totalPublished: number;
      totalArchived: number;
      totalWords: number;
      totalMaterials: number;
      totalTags: number;
      recent: Manuscript[];
    }>;

    /** 搜索结果（不分页，如最近列表） */
    type SimpleList<T> = {
      rows: T[];
    };

    /** 文稿列表查询参数 */
    type ManuscriptSearchParams = CommonType.RecordNullable<
      Pick<Manuscript, 'status'> & { tagId?: number; keyword?: string }
    >;

    /** 素材列表查询参数 */
    type MaterialSearchParams = CommonType.RecordNullable<
      Pick<Material, 'type'> & { keyword?: string }
    >;

    /** 标签列表查询参数 */
    type TagSearchParams = CommonType.RecordNullable<{ keyword?: string }>;

    /** 创建文稿 */
    type CreateManuscriptParams = {
      title: string;
      content?: string;
    };

    /** 更新文稿 */
    type UpdateManuscriptParams = {
      manuscriptId: number;
      title?: string;
      content?: string;
      wordCount?: number;
      status?: string;
    };

    /** 自动保存 */
    type SaveManuscriptParams = {
      manuscriptId: number;
      content: string;
      wordCount?: number;
    };

    /** 修改状态 */
    type ChangeStatusParams = {
      manuscriptId: number;
      status: string;
    };

    /** 绑定标签 */
    type BindTagsParams = {
      manuscriptId: number;
      tagIds: number[];
    };

    /** 创建素材 */
    type CreateMaterialParams = {
      type: '0' | '1' | '2';
      content: string;
      source?: string;
    };

    /** 更新素材 */
    type UpdateMaterialParams = {
      materialId: number;
      type?: '0' | '1' | '2';
      content?: string;
      source?: string;
    };

    /** 创建标签 */
    type CreateTagParams = {
      tagName: string;
      color?: string;
    };

    /** 更新标签 */
    type UpdateTagParams = {
      tagId: number;
      tagName?: string;
      color?: string;
    };

    /** 更新设置 */
    type UpdateSettingParams = {
      fontSize?: number;
      fontFamily?: string;
      autosave?: '0' | '1';
      autosaveInterval?: number;
      exportFormat?: 'md' | 'pdf';
    };

    /** 上传响应 */
    type UploadResponse = {
      url: string;
    };
  }
}
